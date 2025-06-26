import { ApiError } from "../utils/ApiError.js";

const errorHandler = (error, request, resposne, next) => {
    if (error instanceof ApiError) {
        return resposne.status(error.statusCode || 400).json({
            statusCode: error.statusCode,
            success: false,
            data: null,
            message: error.message,
        });
    } else {
        return resposne.status(500).json({
            statusCode: 500,
            success: false,
            data: null,
            message: "Internal Server Error",
        });
    }
};

export { errorHandler };
