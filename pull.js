var aws = require( "aws-sdk" );
var chalk = require( "chalk" );
var Q = require( "q" );

aws.config.update({region: 'us-east-1'});

var sqs = new aws.SQS();

var def = Q.defer();

var createQueue = Q.nbind( sqs.createQueue, sqs );
var receiveMessage = Q.nbind( sqs.receiveMessage, sqs );
var deleteMessage = Q.nbind( sqs.deleteMessage, sqs );
var queueUrl = "";

var params = {
  QueueName: 'testing-queue'
};

function processMessages(){
  receiveMessage({
    QueueUrl: queueUrl
  })
  .then(function(data){
    if(data.Messages.length > 0){
      var message = data.Messages[0];
      var handle = message.ReceiptHandle;
      var body = JSON.parse(message.Body);
      console.log(chalk.green("Received ", message.MessageId));
      console.log(chalk.green("Type ", body.type));
      console.log(chalk.green("Subtype ", body.subtype));

      deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: handle
      }).then(function(data){
        console.log( chalk.green("Successful Delete"));
      })
      .catch( function(error){
        console.log( chalk.red(err, err.stack) );// an error occurred
        cont = 0;
      });
      process.nextTick(processMessages);
    }
  })
  .catch( function(error){
    console.log( chalk.red(err, err.stack) );// an error occurred
    cont = 0;
  });
}

createQueue({QueueName: 'testing-queue'})
.then( function(data){
  console.log( chalk.green("Queue URL: ", data.QueueUrl) );
  queueUrl = data.QueueUrl;

  process.nextTick(processMessages);

})
.catch( function(error){
  console.log( chalk.red(err, err.stack) );// an error occurred
});
