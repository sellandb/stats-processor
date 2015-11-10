var jsdom = require("jsdom");
var aws = require( "aws-sdk" );
var chalk = require( "chalk" );
var Q = require( "q" );

aws.config.update({accessKeyId: 'AKIAIGVL5EBRN3EAALGA', secretAccessKey: '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'});
aws.config.update({region: 'us-west-1'});

var sqs = new aws.SQS();

var createQueue = Q.nbind( sqs.createQueue, sqs );
var sendMessage = Q.nbind( sqs.sendMessage, sqs );

var gameSheets = {};

var messageHeader = {};

//SQS Queue Setup
var params = {
  QueueName: 'testing-queue'
};

var queueUrl = "";

//Get the Game Report URLs

new function(boxScoreUrl) {
  //Go out and grab the various gamesheets
  var def = Q.defer();
  jsdom.env(
    boxScoreUrl,
    ["http://code.jquery.com/jquery.js"],
    function (err, window) {
      window.$("#gameReports div.contentPad li a").each(function(index, el){
        if(el.textContent.indexOf("Game Summary") === 0){
          gameSheets["GS"] = el.getAttribute("href");
        }
        if(el.textContent.indexOf("Full Play-by-Play") === 0){
          gameSheets["PL"] = el.getAttribute("href");
        }
        if(el.textContent.indexOf("TOI") === 0){
          if(el.getAttribute("href").indexOf("/TV"))
          {
            gameSheets["TV"] = el.getAttribute("href");
          }
          if(el.getAttribute("href").indexOf("/TH"))
          {
            gameSheets["TH"] = el.getAttribute("href");
          }
        }
      });
      def.resolve();
    }
  );
  return def.promise;
}("http://www.nhl.com/gamecenter/en/boxscore?id=2015020215")
.then(function(){
  //Setup the Queue URL

  var def = Q.defer();
  createQueue({QueueName: 'testing-queue'})
  .then(function(data){
    queueUrl = data.QueueUrl;
    def.resolve();
  }).catch( function(error){
    console.log( chalk.red(err, err.stack) );// an error occurred
    def.reject(err, err.stack);
  });
  return def.promise;

})
.then(function(){
  //Process the Game Summary and store header data
  var def = Q.defer();
  var url = gameSheets["GS"];
  jsdom.env(
    url,
    ["http://code.jquery.com/jquery.js"],
    function (err, window) {
      //Setup the message header
      var year = url.replace("http://www.nhl.com/scores/htmlreports/", "").substr(0,8);
      var gameID = url.replace("http://www.nhl.com/scores/htmlreports/" + year + "/GS02", "").substr(0,4);
      messageHeader["year"] = year;
      messageHeader["game"] = gameID;
      //StdHeader #Home table td:nth-child(2)
      var homeData = window.$("#StdHeader #Home tr:nth-child(3) td").html();
      var homeTeam = homeData.substr(0, homeData.indexOf("<"));

      var visitorData = window.$("#StdHeader #Visitor tr:nth-child(3) td").html();
      var visitorTeam = visitorData.substr(0, visitorData.indexOf("<"));
      console.log(visitorTeam);

      //Here is the goalie data
      /*window.$("#MainTable tr:nth-child(15) table tr.oddColor, #MainTable tr:nth-child(15) table tr.evenColor").each(function(index, el){
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
      });*/

      def.resolve();
    }
  );
  return def.promise;

});



/*
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
*/




/*
/////////////////////////////////////////////
SCRATCH PAD
//////////////////////////////////////////////
*/

//Data by Sheet
//Game Summary
//General Information (Teams, Dates, Score, Game ID)
//Goaltender Summary

//Play By Play
//Play Information

//Time on Ice Report
// Shift length Information

//Playing Roster
// Number / Team / Position / Name



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

//Box Score Page
//http://www.nhl.com/gamecenter/en/boxscore?id=2012020423

//Stat URLs
//
