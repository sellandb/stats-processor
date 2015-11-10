var jsdom = require("jsdom");
var aws = require( "aws-sdk" );
var chalk = require( "chalk" );
var Q = require( "q" );

aws.config.update({accessKeyId: 'AKIAIGVL5EBRN3EAALGA', secretAccessKey: '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'});
aws.config.update({region: 'us-west-1'});

var sqs = new aws.SQS();

var def = Q.defer();

var createQueue = Q.nbind( sqs.createQueue, sqs );
var sendMessage = Q.nbind( sqs.sendMessage, sqs );

var params = {
  QueueName: 'testing-queue'
};


createQueue({QueueName: 'testing-queue'})
.then( function(data){
  console.log( chalk.green("Queue URL: ", data.QueueUrl) );
  var queueUrl = data.QueueUrl;

  jsdom.env(
    "http://www.nhl.com/scores/htmlreports/20122013/PL020423.HTM",
    ["http://code.jquery.com/jquery.js"],
    function (err, window) {
      window.$("table tr.evenColor:nth-child(10n)").each(function(index, el){
        console.log(chalk.green(el.innerHTML));
        sendMessage({
          MessageBody: JSON.stringify({
            date: "Monday, March 18, 2013",
            game: "0423",
            home: "TAMPA BAY LIGHTNING",
            visitor: "PHILADELPHIA FLYERS",
            type: "PL",
            data: el.innerHTML
          }),
          QueueUrl: queueUrl
        })
        .then(function(data){
          console.log(chalk.green(data.MessageId));
        })
        .catch( function(error){
          console.log( chalk.red(err, err.stack) );// an error occurred
        });
      });
    }
  );

})
.catch( function(error){
  console.log( chalk.red(err, err.stack) );// an error occurred
});

/*jsdom.env(
  "http://www.nhl.com/scores/htmlreports/20122013/PL020423.HTM",
  ["http://code.jquery.com/jquery.js"],
  function (err, window) {
    console.log("The home score was: " + window.$("table tr.evenColor td").html());
  }
);*/

//Game Summary Data
//http://www.nhl.com/scores/htmlreports/20122013/GS020423.HTM
//Score
//#StdHeader #Home table td:nth-child(2)

//Scoring Summary
//#MainTable tr:nth-child(4) table tr.oddColor, #MainTable tr:nth-child(4) table tr.evenColor

//Goalie Summary
//#MainTable tr:nth-child(15) table tr.oddColor, #MainTable tr:nth-child(15) table tr.evenColor


//Event Summary
//http://www.nhl.com/scores/htmlreports/20122013/ES020423.HTM
//Player Summary Data
//table tr:nth-child(8) table tr

//Play by Play
//http://www.nhl.com/scores/htmlreports/20122013/PL020423.HTM

//Event Row
//table tr.evenColor
