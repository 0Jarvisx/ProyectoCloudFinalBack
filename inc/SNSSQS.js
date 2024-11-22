const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const sns = new AWS.SNS();
const sqs = new AWS.SQS();

async function subscribeToSNSEmail(topicArn, email) {
  const params = {
    Protocol: 'email',
    TopicArn: topicArn,
    Endpoint: email,
  };

  try {
    const data = await sns.subscribe(params).promise();
    console.log(`Correo registrado exitosamente en SNS: ${email}`);
    return data.SubscriptionArn;
  } catch (error) {
    console.error('Error al registrar el correo en SNS:', error);
    throw error;
  }
}

async function publishToSNS(topicArn, message, subject = 'Notificación') {
  const params = {
    TopicArn: topicArn,
    Message: message,
    Subject: subject,
  };

  try {
    const data = await sns.publish(params).promise();
    console.log('Mensaje enviado exitosamente a SNS:', data.MessageId);
    return data.MessageId;
  } catch (error) {
    console.error('Error al enviar el mensaje a SNS:', error);
    throw error;
  }
}

async function sendMessageToSQS(queueUrl, messageBody, messageAttributes = {}) {
  const params = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(messageBody),
    MessageAttributes: messageAttributes,
  };

  try {
    const data = await sqs.sendMessage(params).promise();
    console.log('Mensaje registrado exitosamente en SQS:', data.MessageId);
    return data.MessageId;
  } catch (error) {
    console.error('Error al registrar el mensaje en SQS:', error);
    throw error;
  }
}

async function isEmailVerified(topicArn, email) {
    const params = {
      TopicArn: topicArn,
    };
  
    try {
      let isVerified = false;
      let nextToken;
  
      do {
        const data = await sns.listSubscriptionsByTopic({ ...params, NextToken: nextToken }).promise();
        const subscriptions = data.Subscriptions;
        
        for (const subscription of subscriptions) {
          if (subscription.Endpoint === email && subscription.SubscriptionArn !== 'PendingConfirmation') {
            
            isVerified = true;
            break;
          }
        }
  
        nextToken = data.NextToken;
      } while (nextToken && !isVerified);
  
      return isVerified;
    } catch (error) {
      console.error('Error al verificar el correo en SNS:', error);
      throw error;
    }
  }

module.exports = {
  subscribeToSNSEmail,
  publishToSNS,
  sendMessageToSQS,
  isEmailVerified
};
