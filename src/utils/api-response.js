export class ApiResponse {
    constructor(statusCode, data, message = "success") {
        this.statusCode = statusCode || 200
        this.data = data
        this.message = message
        this.success = statusCode < 400
    }
}