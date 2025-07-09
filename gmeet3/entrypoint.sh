#!/bin/bash

# kill any previous Xvfb
pkill Xvfb
rm -f /tmp/.X99-lock

# start Xvfb
Xvfb :99 -screen 0 1920x1080x24 &

# set display and run server
export DISPLAY=:99
python3 server.py python3 server.py || echo "server.py crashed"

# Keep container alive
tail -f /dev/null
