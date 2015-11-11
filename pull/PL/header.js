//StdHeader #Home table td:nth-child(2)
var homeData = window.$("#StdHeader #Home tr:nth-child(3) td").html();
var homeTeam = homeData.substr(0, homeData.indexOf("<"));

var visitorData = window.$("#StdHeader #Visitor tr:nth-child(3) td").html();
var visitorTeam = visitorData.substr(0, visitorData.indexOf("<"));
console.log(visitorTeam);
