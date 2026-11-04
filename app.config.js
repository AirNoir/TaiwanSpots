const appJson = require('./app.json');

const config = {
  ...appJson.expo,
  plugins: [
    ...(appJson.expo.plugins || []),
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY,
      },
    ],
  ],
};

module.exports = config;
