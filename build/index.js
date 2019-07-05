'use strict'

const createReader = require('gtfs-to-leveldb/reader')
const createLevel = require('level')
const { difference, isNaN } = require('lodash')
const lineColours = require('vbb-line-colors')
const levelDirectory = './vbb-gtfs-level'

const products = {
	'700': 'bus',
	'2': 'regional', // @todo
	'3': 'bus',
	'109': 'suburban',
	'900': 'tram',
	'1000': 'ferry',
	'400': 'subway',
	'100': 'regional'
}

const main = async () => {
	const level = createLevel(levelDirectory, { valueEncoding: 'json' })
	const gtfsReader = createReader(level)

	let index = 0
	const routes = await gtfsReader.routes()
	const lineDict = {}
	for (let route of routes) {
		console.error(++index, 'of', routes.length, 'routes processed')

		const lineId = [route.route_id, route.agency_id].join('###')
		if (!lineDict[lineId]) {
			const product = products[route.route_type]
			if (!product) throw new Error('missing product for route_type ' + route.route_type)
			if (!['regional', 'tram', 'subway', 'suburban'].includes(product)) continue

			if (product === 'suburban') {
				const agency = await gtfsReader.agency(route.agency_id)
				if (agency.agency_id !== '1') continue // 1: S-Bahn Berlin, @todo
			}

			const lineName = route.route_short_name || route.route_long_name
			const colour = lineColours[product][lineName]
			if (!colour) continue

			lineDict[lineId] = {
				lineName,
				colour,
				product,
				stopIds: []
			}
		}

		const trips = await gtfsReader.routeTrips(route.route_id)
		for (let trip of trips) {
			const tripStopovers = await gtfsReader.tripStopovers(trip.trip_id)
			lineDict[lineId].stopIds.push(...difference(tripStopovers.map(stopover => stopover.stop_id), lineDict[lineId].stopIds))
		}
	}

	const lines = Object.values(lineDict)
	const points = []

	for (let line of lines) {
		const stops = await Promise.all(line.stopIds.map(stopId => gtfsReader.stop(stopId)))
		// eslint-disable-next-line camelcase
		const locations = stops.map(({ stop_lon, stop_lat }) => [+stop_lon, +stop_lat]).filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat))
		points.push(...locations.map(location => [...location, {
			ref: line.lineName,
			product: line.product,
			backgroundColour: line.colour.bg,
			textColour: line.colour.fg
		}]))
	}

	process.stdout.write(JSON.stringify(points))
}

main()
	.catch(console.error)
