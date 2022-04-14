const PRIORITY_SHEET_NAME_ = 'Problem Priority list';


function onOpen(e){
  var ui = SpreadsheetApp.getUi();

  var menu = ui.createMenu('TDI');
  menu.addItem('Add Distance lookup Trigger', 'createTimeDrivenGoogleMapTrigger');
  menu.addToUi();
  
}

function reportHighPriorityIssues() {
  Logger.log ("Starting reportHighPriorityIssues()");

  //Check to see if there are any issues with a priority of 1.  If so, send email to the transrouting email box
  //so the team knows something is wrong
  //This function should be called with a trigger at least once a day  M-F

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var prioritySheet = ss.getSheetByName(PRIORITY_SHEET_NAME_);

  if (!prioritySheet){
    //Send email that this function failed to find what it needs
    Logger.log("'Problem Priority list' tab missing")
    sendNotification("Trans Data Integrity Check - Error",                       
                      "<h2 style='background-color:tomato;'>The tab 'Problem Priority list' was not found.</h2>"
                    + "<p>Unable to check for data problems in function reportHighPriorityIssues()");
    return;                

  }


  var range = prioritySheet.getRange(1,1,prioritySheet.getLastRow(), prioritySheet.getLastColumn());
  var data = range.getValues()
  var priorityIndex = data[0].indexOf("priority");
  if (priorityIndex == 0) {
    sendNotification("Trans Data Integrity Check - Error",                       
                      "<h2 style='background-color:tomato;'>The 'priority' column could not be found.</h2>"
                    + "<p>Unable to check for data problems in function reportHighPriorityIssues()");
    return;
  }



  var message = '';
  for (var row = 1; row < data.length; row++) {
    if (data[row][priorityIndex] && 
        data[row][priorityIndex] == 1) {
          message += '<li><ul>' //2nd level bulleted list 
                   + '       <li><b>' + data[row][2] + '</li>'
                   + '       <li>'    + data[row][0] + '</li>'  
                   + '       <li>'    + data[row][3] + '</li>'
                   + '<br></ul></li>';
        }
  }

  if (message) {
    Logger.log("Found potential issues...\n" + message);
    
    // some priority 1's were found, send an email
    sendNotification("Trans Data Integrity Check #1 priority issue found",
                     "<h2 style='background-color:tomato;'>Below are one or more high priority data issues that should be investigated.</h2> "
                    + "<p><ol>" + message + "</ol>"
                    + "<br> Results of: "
                    + "<ul><li>Select * <br> from `gcp-gfs.datalab-trans.T3.vw_data_integrity_ref_table_check`"
                    + "<br> Where priority = 1"
                    + "</li></ul>"
                     )
  } else {
    Logger.log ("No issues to report")
  }
  
}

function sendNotification (subject, message) {
  const SUPPORT_EMAIL_ADDRESS = "transrouting@gfs.com";
                              //"rob.steele@gfs.com" ;
  var ss = SpreadsheetApp.getActiveSpreadsheet();


  Logger.log("Sending Email to: " + SUPPORT_EMAIL_ADDRESS);
  MailApp.sendEmail({      to: SUPPORT_EMAIL_ADDRESS,
                      subject: subject,                       
                     htmlBody: message.replace(/\n/g, "<br>") //Convert all line feeds to HTML Breaks <br>
                                +"<br>"
                                + "This is an automated message run from a time based trigger in the app script "
                                + "of <a href='" + ss.getUrl() + "'>" + ss.getName() + "</a> Google Sheet.<br><br>",                        
                      replyTo: SUPPORT_EMAIL_ADDRESS,
                    });



}

