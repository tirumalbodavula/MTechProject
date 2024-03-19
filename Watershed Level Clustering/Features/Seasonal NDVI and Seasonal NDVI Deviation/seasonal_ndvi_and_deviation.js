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
// var start_year=2022;
var start_year=2016;
var end_year=2022;

var landsat = ee.ImageCollection("LANDSAT/LC08/C02/T1_TOA").select(['B4', 'B5', 'B7']);
var landsat_scale = 30;
var landsat_available_from_year = 2013; // it is available from 2013-03-18



function getNDVIDeviation(currYear, start_year_offset, start_month, start_day, end_year_offset, end_month, end_day, roi, delta, season){
  // start_date is ee.Date object
  // roi is ee.FeatureCollection
  // delta is js integer, either 7 or 28
  roi = ee.FeatureCollection(roi); // ensuret the type
  
  var currYear_js = currYear;

  var years = ee.List.sequence(landsat_available_from_year, currYear-1);
  var ndvis = years.map(function(year){
    year = ee.Number(year);
    var sdate = ee.Date.fromYMD(year.add(start_year_offset), start_month, start_day);
    var edate = ee.Date.fromYMD(year.add(end_year_offset), end_month, end_day);
    var dateRange = ee.DateRange(sdate, edate);
    return landsat.filterDate(dateRange)
                  .select(['B5', 'B4'])
                  .mean()
                  .normalizedDifference(['B5', 'B4']);
  });
  ndvis = ee.ImageCollection(ndvis);
  var longterm_mean = ndvis.reduce(ee.Reducer.mean());
  
  currYear = ee.Number(currYear);
  var sdate = ee.Date.fromYMD(currYear.add(start_year_offset), start_month, start_day);
  var edate = ee.Date.fromYMD(currYear.add(end_year_offset), end_month, end_day);
  var dateRange = ee.DateRange(sdate, edate);
  
  var current_year_value = landsat.filterDate(dateRange)
                                  .select(['B5', 'B4'])
                                  .mean()
                                  .normalizedDifference(['B5', 'B4']);
  
  var ndvideviation = (current_year_value.subtract(longterm_mean)).divide(longterm_mean);
  // print(ndvideviation);
  roi = current_year_value.reduceRegions(roi, ee.Reducer.mean(), landsat_scale);
  roi = roi.map(function(feature){
    return feature.set(season+'ndvi-'+currYear_js, ee.Number(feature.get('mean')));
  });
  
  roi = ndvideviation.reduceRegions(roi, ee.Reducer.mean(), landsat_scale);
  
  roi = roi.map(function(feature){
    return feature.set(season+'ndvidev-'+currYear_js, ee.Number(feature.get('mean')).multiply(100));
  });

  return roi;
}

for(var year=start_year ; year<=end_year ; year++){
    aez = getNDVIDeviation(year, 0, 7, 1, 0, 10, 31, aez, 123, 'kharif-');
    aez = getNDVIDeviation(year, 0, 11, 1, 1, 2, 28, aez, 120, 'rabi-');
    aez = getNDVIDeviation(year, 1, 3, 1, 1, 6, 30, aez, 122, 'zaid-');
}
print(aez);

var description = 'aez_'+ae_regcode+'_ndvi_deviation_2016-22';
var assetId = 'projects/ee-rittwick-n-tirumal/assets/analysis/' + description+"_v3";


Export.table.toAsset({
  collection: aez, 
  description: description, 
  assetId: assetId
});


