// Mock for @expo/vector-icons
const React = require('react');
const { Text } = require('react-native');

const createIconComponent = (name) => {
  return (props) => React.createElement(Text, props, name);
};

module.exports = {
  Ionicons: createIconComponent('Ionicons'),
  MaterialIcons: createIconComponent('MaterialIcons'),
  FontAwesome: createIconComponent('FontAwesome'),
  Feather: createIconComponent('Feather'),
  MaterialCommunityIcons: createIconComponent('MaterialCommunityIcons'),
};
