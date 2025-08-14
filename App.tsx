import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Platform } from 'react-native';
import VideoPlayerWithSubtitles from './src/components/VideoPlayerWithSubtitles';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <VideoPlayerWithSubtitles />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});