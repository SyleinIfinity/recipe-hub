import { validateContract } from './openapi-contract.js';
const result = await validateContract();
console.log(
  `OpenAPI 3.1 valid: ${result.paths} paths, ${result.operations} operations, ${result.schemas} schemas; route parity passed (explicit Express mounts).`,
);
