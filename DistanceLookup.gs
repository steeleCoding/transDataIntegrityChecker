

function createTimeDrivenGoogleMapTrigger() {
  var functionForTrigger = 'getDistanceForLocationsThatNeedIt';

  const allTriggers = ScriptApp.getProjectTriggers();
  for (let index = 0; index < allTriggers.length; index++) {
    // If the current trigger is the correct one, delete it.
    if (allTriggers[index].getHandlerFunction() == functionForTrigger) {
      //trigger already set
      return;
          //   Logger.log("Deleting Trigger %s" , allTriggers[index]);
          //   ScriptApp.deleteTrigger(allTriggers[index]);
    }
  }

  Logger.log("Creating trigger for %s",functionForTrigger )
  // // Trigger every 2 hours.
  ScriptApp.newTrigger(functionForTrigger)
           .timeBased()
           .everyHours(2)
           .create();
}

function zipCodemiles () {
    //   insert into  `gcp-gfs-datalab-trans.T3.tbl_driving_distance_between_zipcode`
    //  (from_postal_code,
    //   from_longitude,
    //   from_latitude,
    //   to_postal_code,
    //   to_longitude,
    //   to_latitude,
    //   drive_miles,
    //   drive_minutes,
    //   crow_fly_miles,
    //   crow_fly_ratio )

    getDistanceBetweenAddress(fromPostalCode, toPostalCode)
}

function getDistanceForLocationsThatNeedIt () {
    
   //Get From and To info
   var sql = "select distinct     --\n \
                      from_id,    --\n \
                      from_long,    --\n \
                      from_lat,    --\n \
                      to_id,    --\n \
                      to_long,    --\n \
                      to_lat,    --\n \
                      from_type,    --\n \
                      to_type,    --\n \
                  from `gcp-gfs-datalab-trans.robs_library.vw_distances_needing_google_data`    --\n \
              LIMIT 1000   ";
    var dataset = TapRoot.runQuery('gcp-gfs-datalab-trans', sql);
  
    var insertSQLBase = "insert into `gcp-gfs-datalab-trans.robs_library.test_google_miles`   --\n \
                          (from_location, from_location_type, to_location,to_location_type,miles,travel_time) --\n \
                          VALUES \n";
            //NOTE.  the distance API also returns A "TRAVEL TIME".  we should probably get that while we are at it
    var insertSqlDetails = "";
    var counter = 0;

    if (dataset && dataset.length > 1) {  
      Logger.log("Found %s records that need directions", dataset.length - 1)  ;
      for (var i = 1; i < dataset.length; i++){
        // Logger.log ( dataset[i])  ;
        
        let fromLongitude = dataset[i][1];
        let toLongitude   = dataset[i][4];
        let fromLattitude = dataset[i][2];
        let toLattitude   = dataset[i][5];
        let fromCust      = dataset[i][0];
        let toCust        = dataset[i][3];
        let fromType      = dataset[i][6];
        let toType        = dataset[i][7];

        //getDistanceBetween
        let route;
        try{
          route = getDistanceBetween(fromLattitude, fromLongitude, toLattitude, toLongitude)
        } catch(e) {
          Logger.log( "error on call %s :  %s", i,  e.stack);
        }
        //insert into miles table
        if (route && route.dist > -1) {
          var miles = Math.round(route.dist);
          var duration = Math.round(route.dur);
          if (insertSqlDetails.length > 0) {
            insertSqlDetails += ",\n"
          }
          insertSqlDetails += "('" + fromCust + "', '" + fromType + "', '" + toCust + "', '" + toType + "', " + miles + ", " + duration + " ),"
                           +  "('" + toCust + "', '" + toType + "', '" + fromCust + "', '" + fromType + "', " + miles + ", " + duration + " )"
          counter++;
          // Logger.log(insertSqlDetails);
        } else {
          Logger.log("NO MILES!!! from: " + fromCust + " TO: " + toCust + " Miles " + miles )
          continue;
        }

        if (i % 200 == 0) {
          Logger.log( "Inserting 200 rows");
          TapRoot.runSqlCommand('gcp-gfs-datalab-trans', insertSQLBase + insertSqlDetails);  
          insertSqlDetails = "";
        }
      }  //end loop

      // insert records
      if (insertSqlDetails.length > 0) {
        Logger.log( "Inserting final " );
        TapRoot.runSqlCommand('gcp-gfs-datalab-trans', insertSQLBase + insertSqlDetails);        
      }

      Logger.log ("Looked up a total of %s directions", counter)
    }
}


function getDistanceBetween(originLat, originLong, destLat, destLong) {

    // Create a new Direction finder using Maps API available on Google Apps Script
    var finder = Maps.newDirectionFinder()
    .setOrigin(originLat, originLong)
    .setDestination(destLat, destLong)
    .setRegion("us")
    //.addWaypoint(address)
    //.addWaypoint(waypointLat, waypointLong)
    //.setOptimizeWaypoints(true)  //default false
    .setMode(Maps.DirectionFinder.Mode.DRIVING);


    var directions = finder.getDirections(); // Direction Object

    // The path may have some segments so it sum them all up
    if(directions.routes[0]){
      var route = directions.routes[0].legs.reduce(function(acc, currentRow){
                                                    acc.dist += currentRow.distance.value/1609.34;
                                                    acc.dur += currentRow.duration.value/60;
                                                    return acc;
                                                 }
                                                 ,{dist:0,dur:0});
      
        return route;
    }
}

function getDistanceBetweenAddress(fromAddress, toAddress) {

    // Create a new Direction finder using Maps API available on Google Apps Script
    var directions = Maps.newDirectionFinder()
    .setOrigin(fromAddress)
    .setDestination(toAddress)
    //.addWaypoint(address)
    //.addWaypoint(waypointLat, waypointLong)
    //.setOptimizeWaypoints(true)  //default false
    .setMode(Maps.DirectionFinder.Mode.DRIVING)
    .getDirections(); // Direction Object

    // The path may have some segments so it sum it all
    if(directions.routes[0]){
        //reduce is an "Array"  function.  see https://www.w3schools.com/jsref/jsref_reduce.asp
        //routes[0] says to use the first route calculated( we don't care about any "alternate" routes Google may have calculated)
        var route = directions.routes[0].legs.reduce(function(accumulator, currentRow, currentIndex, legs){
                                                    accumulator.dist += currentRow.distance.value/1609.34;
                                                    accumulator.dur += currentRow.duration.value/60;
                                                    if (currentIndex == 0) { 
                                                      accumulator.fromLat = currentRow.start_location.lat;
                                                      accumulator.fromLng = currentRow.start_location.lng;
                                                    }
                                                    if (currentIndex = legs.length - 1) {
                                                      //last leg, get the destination geo points
                                                      accumulator.toLat = currentRow.end_location.lat;
                                                      accumulator.toLng = currentRow.end_location.lng;
                                                    }
                                                    return accumulator;
                                                 }
                                                 ,{dist:0,dur:0,fromLat:0,fromLng:0,toLat:0,toLng:0}
                                                 );

        
        return route;
    }
}









/** 
 * Finds a limited number of customers that have addresses but no GeoCode data
 * then calls Google to get the Geo information.
 * if a geo code was found, the information is stored in the database.
 * Note: This function creates a single large insert statement for 
 *       all the geocodes found.  This is much more efficient then making
 *       one insert call per customer.
 *       Example: INSERT into table (field1, field2,etc)
 *                VALUES (a1, a2, a3),
 *                       (b1, b2, b3),
 *                       (c1, c2, c3),
 *                       (d1, d2, d3)
 */
function getAndStoreLatLongForNonRoadnetAccounts() { 
  var sourceName = "function getAndStoreLatLongForNonRoadnetAccounts() of " + SpreadsheetApp.getActiveSpreadsheet().getUrl();
  var insertSql ='';
  var geocoder = Maps.newGeocoder().setRegion('us');
  
  var custsWoLatLongSql = sqlForMissingLatLong(500);

  
  var dataSet = TapRoot.runQuery('gcp-gfs-datalab-trans', custsWoLatLongSql);
  if (dataSet && dataSet.length > 1) {
    var insertCount = 0;
    var custCol = dataSet[0].indexOf("Gfs Customer Id");
    var siteCol = dataSet[0].indexOf("Site Id");
    var addressCol = dataSet[0].indexOf("Address");
    
    for (let i = 1; i < dataSet.length; i++) {
      let custId = dataSet[i][custCol];
      let siteId = dataSet[i][siteCol];
      let address = dataSet[i][addressCol];      
      let lat = '';
      let lng = '';
      // Logger.log("cust %s, site %s addr %s",custId, siteId,address);
      try { 
        if (address ){    
          // Logger.log("GeoCoding %s", address)
          if (insertCount %25 == 0 && insertCount > 0 ){
             Logger.log("...%s",insertCount);
          }
          var location = geocoder.geocode(address);
          if (location.status == 'OK') {  //indicates google found an location for this address
            lat = location["results"][0]["geometry"]["location"]["lat"];
            lng = location["results"][0]["geometry"]["location"]["lng"];

            if (insertCount == 0) {
               insertSql += "insert into `gcp-gfs-datalab-trans.T3.ref_site_lat_lng_not_in_roadnet` (gfs_customer_id, site_id, latitude, longitude, created_tmstmp, source, address_used)     values";               
            } else {
              insertSql += ", ";  //insert a comma before each subsequent record
            }
            insertSql += " ('" + custId + "'," + siteId + "," + lat + "," + lng 
                            + ", current_timestamp(), '''" + sourceName + "''', '''" 
                             + address +"''') \n";
            insertCount++;
          } else {
            Logger.log ("Could not find Geo code for %s %s", custId, address);
          }
        }
      }catch (e) {
        Logger.log ("Unexpected Error while  Geo Coding for [%s].\n %s",  address, e.stack);
      }
    }
    if (insertCount > 0) {
      Logger.log ("Running insert statement for %s records", insertCount);
      TapRoot.runSqlCommand('gcp-gfs-datalab-trans',insertSql);
    }
    Logger.log ("Completed");
  }



}    




function sqlForMissingLatLong(limit) {
  if (!limit || isNaN(limit)){
    limit = 100;
  }

  var sql = "select distinct    --\n \
        gcs.gfs_customer_id,  --\n \
        gcs.crm_site_id as site_id, --\n \
        cs.address_1_txt  --\n \
          || coalesce(', ' || address_2_txt, '')  --\n \
          || coalesce(', ' || address_3_txt, '') --\n \
          || ' ' --\n \
          ||cs.city_name || ', ' --\n \
          || cs.state_alpha_code || ' ' --\n \
          as address, --\n \
    from `gcp-gfs-datalake-core-prd.ot1__cust_admin__views_current.gfs_customer_site` gcs  --\n \
    join `gcp-gfs-datalake-core-prd.ot1__cust_admin__views_current.crm_site` cs  --\n \
      on gcs.crm_site_id = cs.crm_site_id --\n \
    join `gcp-gfs-datalab-trans.T3.ref_customer` c  --\n \
      on c.gfs_customer_id = gcs.gfs_customer_id  --\n \
    left join  ( select delivery_site_id,  --\n \
                        gfs_customer_id,  --\n \
                        max(latitude) as latitude,  --\n \
                        min(longitude)  as longitude --\n \
                  from `gcp-gfs-datalab-trans.T3.ref_roadnet_locations`  --\n \
                  where latitude is not null and longitude is not null --\n \
                  group by delivery_site_id, gfs_customer_id ) rl   --\n \
      on rl.gfs_customer_id = gcs.gfs_customer_id --\n \
      and rl.delivery_site_id = gcs.crm_site_id     --\n \
    left join  `gcp-gfs-datalab-trans.T3.ref_site_lat_lng_not_in_roadnet` ll --\n \
      on   ll.gfs_customer_id = gcs.gfs_customer_id --\n \
      and ll.site_id = gcs.crm_site_id  --\n \
    where true  --\n \
    and rl.gfs_customer_id is null --\n \
      and safe_cast(gcs.gfs_customer_id as int64) > 99999999 --\n \
      and gfs_customer_type_code = 0 --\n \
      and gcs.primary_site_ind = 1 --\n \
      and c.Customer_status = 'AC' --\n \
      and cs.address_1_txt is not null  --\n \
      and cs.city_name is not null --\n \
      and cs.state_alpha_code is not null  --\n \
      and cs.country_code = 'US' --\n \
       and c.customer_status_date > date_sub(current_date(), interval 365 DAY)  --\n \
      -- only worry about the ones that have recently been set up --\n \
      and ll.gfs_customer_id is null --\n \
    LIMIT " + limit ;

  return sql;
}
