var jsdom = require("jsdom");
var aws = require( "aws-sdk" );
var chalk = require( "chalk" );
var Q = require( "q" );

//Setup AWS SQS
aws.config.update({region: 'us-east-1'});
var sqs = new aws.SQS();
var createQueue = Q.nbind( sqs.createQueue, sqs );
var sendMessage = Q.nbind( sqs.sendMessage, sqs );

//global variables for tracking state
var gameSheets = {};        //store URLs for the Gamesheets that are being parsed
var messageHeader = {};     //store the message header information between requests
var queueUrl = "";          //The URL for the queue
var debugSend = false;       //Turn on (set to true) to disable sending to the queue


new function(boxScoreUrl) {

  //Go out and grab the various gamesheets
  var def = Q.defer();
  jsdom.env(
    boxScoreUrl,
    ["http://code.jquery.com/jquery.js"],
    function (err, window) {

      //Grab the URLs out of the Game Reports Box
      window.$("#gameReports div.contentPad li a").each(function(index, el){

        //Figure out if this is a linke we care about and then store appropriately
        if(el.textContent.indexOf("Game Summary") === 0){
          gameSheets["GS"] = el.getAttribute("href");
        }
        if(el.textContent.indexOf("Full Play-by-Play") === 0){
          gameSheets["PL"] = el.getAttribute("href");
        }
        if(el.textContent.indexOf("TOI") === 0){

          //Figure out if this is the home (TH) or visitor (TV) TOI report
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

  //Setup the queue for use in subsequent requests
  var def = Q.defer();

  createQueue({
    QueueName: 'testing-queue'
  })
  .then(function(data){
    queueUrl = data.QueueUrl;
    console.log(chalk.green(queueUrl));
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
  console.log(chalk.green("Parsing: ", url));

  jsdom.env(
    url,
    ["http://code.jquery.com/jquery.js"],
    function (err, window) {

      //Setup the message header
      var year = url.replace("http://www.nhl.com/scores/htmlreports/", "").substr(0,8);
      var gameID = url.replace("http://www.nhl.com/scores/htmlreports/" + year + "/GS02", "").substr(0,4);
      messageHeader["year"] = year;
      messageHeader["game"] = gameID;

      //check if we are in debug
      if(!debugSend){

        //Send the Game Header datagram
        sendMessage({
          MessageBody: JSON.stringify({
            "year": messageHeader["year"],
            "game": messageHeader["game"],
            type: "GS",
            subtype: "header",
            data: window.$("#StdHeader").html()
          }),
          QueueUrl: queueUrl
        })
        .then(function(data){
          //Datagram Sent
          console.log(chalk.green("Sent ", data.MessageId));
        })
        .catch( function(error){
          //Datagram Error
          console.log( chalk.red(err, err.stack) );// an error occurred
        });

        //Send the Goalie Report Datagram
        sendMessage({
          MessageBody: JSON.stringify({
            "year": messageHeader["year"],
            "game": messageHeader["game"],
            type: "GS",
            subtype: "goalie",
            data: window.$("#MainTable tr:nth-child(15) table tr.oddColor, #MainTable tr:nth-child(15) table tr.evenColor").html()
          }),
          QueueUrl: queueUrl
        })
        .then(function(data){
          //Datagram Sent
          console.log(chalk.green("Sent ", data.MessageId));
        })
        .catch( function(error){
          //Datagram Error
          console.log( chalk.red(err, err.stack) );// an error occurred
        });
      }


      def.resolve();
    }
  );
  return def.promise;

})
.then(function(){

  //Process the Play by Play and store header data
  var def = Q.defer();
  var url = gameSheets["PL"];
  console.log(chalk.green("Parsing: ", url));

  jsdom.env(
    url,
    ["http://code.jquery.com/jquery.js"],
    function (err, window) {

      //Grab each of the game events
      window.$("table tr.evenColor").each(function(i, el){

        //check if we are in debug
        if(!debugSend){

          //Send the event datagram
          sendMessage({
            MessageBody: JSON.stringify({
              "year": messageHeader["year"],
              "game": messageHeader["game"],
              type: "PL",
              subtype: "event",
              data: el.innerHTML
            }),
            QueueUrl: queueUrl
          })
          .then(function(data){
            //Datagram Sent
            console.log( chalk.green("Sent ", data.MessageId));
          })
          .catch( function(error){
            //Datagram Error
            console.log( chalk.red(err, err.stack) );// an error occurred
          });

        }

      });
      def.resolve();
    }
  );
  return def.promise;

})
.then(function(){

  //Process the Play by Play and store header data
  var def = Q.defer();
  var url = gameSheets["TV"];
  console.log(chalk.green("Parsing: ", url));

  jsdom.env(
    url,
    ["http://code.jquery.com/jquery.js"],
    function (err, window) {

      var team = window.$("table tr:nth-child(3) table tr td").html();

      //Grab each of the player datagrams
      window.$("table tr:nth-child(4) td table tr td.playerHeading").each(function(i, el){
        var player = el.textContent;
        var startPoint = window.$(el).parent().next().next();

        while(startPoint.hasClass("oddColor") || startPoint.hasClass("evenColor")){

          if(!debugSend){

            sendMessage({
              MessageBody: JSON.stringify({
                "year": messageHeader["year"],
                "game": messageHeader["game"],
                "team": team,
                "player": player,
                type: "TOI",
                subtype: "player",
                data: startPoint.html()
              }),
              QueueUrl: queueUrl
            })
            .then(function(data){
              //Datagram Sent
              console.log( chalk.green("Sent ", data.MessageId));
            })
            .catch( function(error){
              //Datagram Error
              console.log( chalk.red(err, err.stack) );// an error occurred
            });
          }

          startPoint = startPoint.next();
        }

      });

      def.resolve();
    }
  );
  return def.promise;

});




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
