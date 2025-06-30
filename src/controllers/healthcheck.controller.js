import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const healthcheck = asyncHandler(async (req, res) => {});

export { healthcheck };
