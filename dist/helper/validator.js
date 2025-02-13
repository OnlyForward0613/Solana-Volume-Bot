"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationSource = void 0;
const ApiError_1 = require("../core/ApiError");
var ValidationSource;
(function (ValidationSource) {
    ValidationSource["BODY"] = "body";
    ValidationSource["HEADER"] = "headers";
    ValidationSource["QUERY"] = "query";
    ValidationSource["PARAM"] = "params";
})(ValidationSource || (exports.ValidationSource = ValidationSource = {}));
exports.default = (schema, source = ValidationSource.BODY) => (req, res, next) => {
    try {
        console.log(req[source]);
        const { error } = schema.validate(req[source]);
        if (!error)
            return next();
        const { details } = error;
        const message = details
            .map((i) => i.message.replace(/['"]+/g, ''))
            .join(',');
        next(new ApiError_1.BadRequestError(message));
    }
    catch (error) {
        next(error);
    }
};
