var modis = ee.ImageCollection("MODIS/061/MOD16A2GF").select(['ET']);
var modis_scale = 500;
var modis_available_from_year = 2000;

var watersheds = ee.FeatureCollection('users/mtpictd/watersheds_india');
var agro_eco_zones = ee.FeatureCollection('users/mtpictd/agro_eco_regions');
var ae_regcode = 13;
var aez = agro_eco_zones.filter(ee.Filter.eq('ae_regcode', ae_regcode));
var ws = watersheds.filterBounds(aez);
print(ws);

/*********
 * Seasons
 * Kharif - 7 8 9 10
 * Rabi - 1 2 11 12
 * Zaid - 3 4 5 6
*/
function getSeasonalFilter(season, year){
  if(season=='kharif'){
    return [year+'-07-01', year+'-10-31'];
  }else if(season=='rabi'){
    return [year+'-11-01', (year+1)+'-02-28'];
  }else if(season=='zaid'){
    return [(year+1)+'-03-01', (year+1)+'-06-30'];
  }else{
    return [year+'-07-01', (year+1)+'-06-30'];
  }
}

function renameColumn(old_name, new_name, fc){
  // old_name -> ee.String
  // new_name -> ee.String
  // fc -> ee.FeatureColleciton
  old_name = ee.String(old_name);
  new_name = ee.String(new_name);
  fc = ee.FeatureCollection(fc);
  fc = fc.map(function(f){
    return f.set(new_name, f.get(old_name));
  });
  return fc;
}

function concat(str1, str2){
  // str1 and str2 can be js string or ee.String 
  str1 = ee.String(str1);
  str2 = ee.String(str2);
  return str1.cat(str2);
}

function replaceDot(str){
  // var str = ee.String('total_ET_2016_kharif_(mm in 123.0 days)');
  str = ee.String(str);
  var sub = str.split('[.]');
  var sec = ee.String(sub.get(1)).slice(1);
  str = concat(sub.get(0), sec);
  return str;
}


for(var year=2016;year<=2022;year++){
  var seasons = ['kharif','rabi','zaid'];
  seasons.forEach(function(season){
    var start_and_end_date = getSeasonalFilter(season, year);
    var start_date = start_and_end_date[0];
    var end_date = start_and_end_date[1];
    var seasonal_modis = modis.filterDate(start_date, end_date).sum();
    seasonal_modis = seasonal_modis.multiply(0.1); // scale_factor is 0.1 for ET (https://lpdaac.usgs.gov/documents/931/MOD16_User_Guide_V61.pdf section 6.2.1)
    ws = seasonal_modis.reduceRegions(ws, ee.Reducer.mean(), modis_scale);
    var new_col_name = 'total_ET_'+ year+'_'+season+'_(mm in ';
    var total_number_of_days = ee.Date.parse('Y-M-d', end_date).difference(ee.Date.parse('Y-M-d', start_date), 'day').add(1);
    new_col_name = concat(new_col_name, total_number_of_days);
    new_col_name = concat(new_col_name, ' days)');
    new_col_name = replaceDot(new_col_name);
    ws = renameColumn('mean', new_col_name, ws);
  });
}

print(ws);
var filename = 'total_ET_seasonal_aez'+ae_regcode+'_2016-22';
var fileloc = 'projects/ee-tirumal/assets/aez/';
var description = filename;
var assetId = fileloc+filename;
Export.table.toAsset(ws, description, assetId);



/* Logic */
/*
var year = 2016;
var start_date = '2016-07-01';
var end_date = '2016-10-31'
var seasonal_modis = modis.filterDate(start_date, end_date).sum();

seasonal_modis = seasonal_modis.multiply(0.1); // scale_factor is 0.1 for ET (https://lpdaac.usgs.gov/documents/931/MOD16_User_Guide_V61.pdf section 6.2.1)

roi = seasonal_modis.reduceRegions(ws, ee.Reducer.mean(), modis_scale);


*/


