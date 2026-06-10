// Pure re-export of the legacy Preview class. Both default and named exports
// must point straight at the imported module to avoid a webpack TDZ trap where
// harmony export getters reference variables declared inside this module's body.
export { default, default as Preview } from './lib/Preview';
