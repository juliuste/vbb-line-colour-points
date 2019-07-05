#!/usr/bin/env bash

echo 'Cleaning up…'
rm -rf vbb-gtfs vbb-gtfs.zip vbb-gtfs-level

echo 'Downloading…'
curl 'https://www.vbb.de/media/download/2029' > vbb-gtfs.zip

echo 'Unpacking…'
unzip -d vbb-gtfs vbb-gtfs.zip

echo 'Loading to level database…'
gtfs-to-leveldb vbb-gtfs vbb-gtfs-level
