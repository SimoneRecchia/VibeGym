/**
 * @format
 */

import { AppRegistry } from 'react-native';
import notifee from 'react-native-notify-kit';
import App from './App';
import { name as appName } from './app.json';
import { handleWorkoutNotificationEvent } from './src/services/workoutNotification';

// Buttons of the workout notification (−15 s, +15 s, skip) with the app in
// background or the phone locked.
notifee.onBackgroundEvent(handleWorkoutNotificationEvent);

AppRegistry.registerComponent(appName, () => App);
