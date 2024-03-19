/*********** Utils start *******************/
function getDayOfYear(date){
  // date is ee.Date object
  date = ee.Date(date); // ensure the type 
  
  return date.difference(ee.Date.fromYMD(date.get('year'), 1, 1), 'day').add(1);
}
/*********** Utils end *******************/

/* SET PARAMETERS */
// var current_year = 2021; // for this year the computation is begin done
var ae_regcode = 13;
/*****************/


/************** Import the region of interest ******************/
var ws = ee.FeatureCollection('users/mtpictd/watersheds_india');
var agro_eco_zones = ee.FeatureCollection('users/mtpictd/agro_eco_regions');
var primaryKey = 'objectid';


var aez = ws.filterBounds(agro_eco_zones.filter(ee.Filter.eq('ae_regcode', ae_regcode)));
// MapDotAddLayer(aez);
// print(ws.size());

var aez_name = 'aez'+ae_regcode;
// var start_year=2021;
var start_year=2016;
var end_year=2022;

var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").select('precipitation');
var chirps_available_from_year = 2000; //1981 it is available from 1981-01-01
var chirps_scale = 5566;

function getRainfallDeviation(currYear, start_year_offset, start_month, start_day, end_year_offset, end_month, end_day, roi, delta, season){
  // start_date is ee.Date object
  // roi is ee.FeatureCollection
  // delta is js integer, either 7 or 28
  // start_date = ee.Date(start_date); // ensure the type
  roi = ee.FeatureCollection(roi); // ensuret the type
  
  
  // var starting_day_of_year = getDayOfYear(start_date);
  // var days = ee.List.sequence(starting_day_of_year, starting_day_of_year.add(delta));
  var years = ee.List.sequence(chirps_available_from_year, currYear-1);
  var longterm_mean = ee.ImageCollection(years.map(function(year){
    year = ee.Number(year);
    var sdate = ee.Date.fromYMD(year.add(start_year_offset), start_month, start_day);
    var edate = ee.Date.fromYMD(year.add(end_year_offset), end_month, end_day);
    var dateRange = ee.DateRange(sdate, edate);
    return (chirps.filterDate(dateRange)).sum();
  })).mean();

  currYear = ee.Number(currYear);
  var sdate = ee.Date.fromYMD(currYear.add(start_year_offset), start_month, start_day);
  var edate = ee.Date.fromYMD(currYear.add(end_year_offset), end_month, end_day);
  var dateRange = ee.DateRange(sdate, edate);
  
  var current_year_value = (chirps.filterDate(dateRange)).sum();
  
  roi = current_year_value.reduceRegions(roi, ee.Reducer.mean(), chirps_scale);
  roi = roi.map(function(feature){
    return feature.set(season+'rainfall-'+year, ee.Number(feature.get('mean')));
  });
  
  var rainfalldeviation = (current_year_value.subtract(longterm_mean)).divide(longterm_mean);
  // print(rainfalldeviation);
  roi = rainfalldeviation.reduceRegions(roi, ee.Reducer.mean(), 5566);
  roi = roi.map(function(feature){
    return feature.set(season+'rfdev-'+year, ee.Number(feature.get('mean')).multiply(100));
  });

  return roi;
}

for(var year=start_year ; year<=end_year ; year++){
    aez = getRainfallDeviation(year, 0, 7, 1, 0, 10, 31, aez, 123, 'kharif-');
    aez = getRainfallDeviation(year, 0, 11, 1, 1, 2, 28, aez, 120, 'rabi-');
    aez = getRainfallDeviation(year, 1, 3, 1, 1, 6, 30, aez, 122, 'zaid-');
}
print(aez)

var description = 'aez_'+ae_regcode+'_rainfall_deviation_2016-22';
var assetId = 'projects/ee-rittwick-n-tirumal/assets/analysis/rf-and-rfdev/' + description;


Export.table.toAsset({
  collection: aez, 
  description: description, 
  assetId: assetId
});


