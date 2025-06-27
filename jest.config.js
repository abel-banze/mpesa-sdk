/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/test/**/*.test.ts"], // Onde seus testes estão
  moduleFileExtensions: ["ts", "js", "json", "node"],
};