const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configuración de DynamoDB
AWS.config.update({ region: 'us-east-1' });
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Función para registrar un evento
async function logEvent(eventData) {
  const { eventType, entityId, entityType, message } = eventData;

  const id = entityId.toString(); // Clave de partición
  const id_log = uuidv4(); // Clave de ordenación

  const params = {
    TableName: 'BitacoraProyectoFinal', 
    Item: {
      id, 
      id_log, 
      eventType, 
      entity_type: entityType,
      message,
      timestamp: new Date().toISOString(),
    },
  };

  try {
    await dynamoDB.put(params).promise();
    console.log(`Evento registrado exitosamente: ${id_log}`);
  } catch (error) {
    console.error('Error al registrar el evento:', error);
  }
}

module.exports = {logEvent}