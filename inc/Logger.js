const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({ region: 'us-east-1' });
const dynamoDB = new AWS.DynamoDB.DocumentClient();

async function logEvent(eventData) {
  const { eventType, entityId, entityType, message } = eventData;  
  
  const id = typeof entityId == 'string' ? entityId :  (typeof entityId != 'object') ? entityId.toString() : '0';
  const id_log = uuidv4(); 

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