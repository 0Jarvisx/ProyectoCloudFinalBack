const AWS = require("aws-sdk");
const sharp = require("sharp");

// Configuración de AWS local (si estás usando credenciales de AWS CLI)
AWS.config.update({
  region: "us-east-1", // Ajusta según tu región
});

const s3 = new AWS.S3();

// Función Lambda simulada
exports.handler = async (event) => {
  try {
    const bucketName = event.Records[0].s3.bucket.name;
    const objectKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    
    console.log(`Procesando archivo: ${objectKey} en el bucket: ${bucketName}`);

    const originalImage = await s3.getObject({ Bucket: bucketName, Key: objectKey }).promise();

    const thumbnailBuffer = await sharp(originalImage.Body)
      .resize({ width: 200 }) 
      .toBuffer();

    if (originalImage.Metadata.thumbnail === "true") {
      console.log("El archivo ya es una miniatura. No se procesará.");
      return;
    }

    await s3
      .putObject({
        Bucket: bucketName,
        Key: objectKey,
        Body: thumbnailBuffer,
        ContentType: originalImage.ContentType,
        Metadata: { thumbnail: "true" },
      })
      .promise();

    console.log(`Imagen sobrescrita: ${objectKey}`);
    return { statusCode: 200, body: "Miniatura generada con éxito y archivo sobrescrito." };
  } catch (error) {
    console.error("Error procesando el evento:", error);
    throw new Error("Error procesando el evento.");
  }
};