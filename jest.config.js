module.exports = {
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest"
  },
  reporters: [
    "default",
    [ "jest-junit", { outputDirectory: ".", outputName: "junit.xml" } ]
  ]
};
