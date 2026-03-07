// Passthrough mock - just returns the component without CSS interop
module.exports = {
  cssInterop: jest.fn((component) => component),
  remapProps: jest.fn((component) => component),
  StyleSheet: {
    create: (styles) => styles,
  },
};
