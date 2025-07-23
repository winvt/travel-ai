@echo off
echo Setting up Amadeus API Proxy Server...
echo.

echo Installing proxy server dependencies...
npm install express cors node-fetch
echo.

echo Proxy server setup complete!
echo.
echo To start the proxy server, run:
echo   node server.js
echo.
echo Then start your React app in another terminal:
echo   npm start
echo.
pause 