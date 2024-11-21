// Respuesta de éxito
const successResponse = (message, data = null, statusCode = 200) => {
    return {
      success: true,
      statusCode,
      message,
      data,
    };
  };
  
  // Respuesta de error
const errorResponse = (message = "Ocurrió un error", statusCode = 500, errorData = null) => {
    return {
      success: false,
      statusCode,
      message,
      errorData,
    };
  };

  module.exports = {errorResponse, successResponse}