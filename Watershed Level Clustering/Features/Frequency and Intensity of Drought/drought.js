// Script drought-mohanpur

/*********** Utils start *******************/
function MapDotAddLayer(fOrFc){
  Map.addLayer(fOrFc);
  Map.centerObject(fOrFc);
}
function getDayOfYear(date){
  // date is ee.Date object
  date = ee.Date(date); // ensure the type 
  
  return date.difference(ee.Date.fromYMD(date.get('year'), 1, 1), 'day').add(1);
}
function concat(str1, str2){
  // str1 and str2 can be js string or ee.String 
  str1 = ee.String(str1);
  str2 = ee.String(str2);
  return str1.cat(str2);
}
function date2str(date){
  // date is ee.Date object
  date = ee.Date(date); // ensure the type 
  var year = concat(ee.String.encodeJSON(date.get('year')), "-");
  var month = concat(ee.String.encodeJSON(date.get('month')), "-");
  var day = ee.String.encodeJSON(date.get('day'));
  var string = concat(concat(year, month), day);
  return string;
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
function renameColumnWithTransformation(old_name, new_name, fc, transform, args){
  // old_name -> ee.String
  // new_name -> ee.String
  // fc -> ee.FeatureColleciton
  // transformation:function -> function to apply on old_value
  // args:ee.Dictionary -> arguments to transformation, args will be modified and will contain a field 'value' which is the carrier of data
  
  old_name = ee.String(old_name);
  new_name = ee.String(new_name);
  fc = ee.FeatureCollection(fc);
  fc = fc.map(function(f){
    var old_value = f.get(old_name);
    
    // args = args.set('value', old_value); // this line will produce error as you can not modify from map
                                            // that's why make a new dictionary and modify it
    var new_args = args;
    new_args = new_args.set('value', old_value);
    var new_value = transform(new_args);
    return f.set(new_name, new_value);
  });
  return fc;
}
function sqm2sqkm(args){
  // var value = args['value'];
  // var scale = args['scale'];
  var value = args.get('value');
  var scale = args.get('scale');
  
  value = ee.Number(value);
  scale = ee.Number(scale);
  value = value.multiply((scale.multiply(scale)).divide(1000000));
  return value;
}
/*********** Utils end *********************/
for(var current_year=2003;current_year<=2022;current_year++){

/* SET PARAMETERS */
// var current_year = 2021; // for this year the computation is begin done
// var ae_regcode = 13;
var block_slno = 3;
/*****************/


/************** Import the region of interest ******************/
var block1 = ee.FeatureCollection('projects/ee-anz208490/assets/rdf_revised_pcraster_pindwara');
var block2 = ee.FeatureCollection('projects/ee-anz208490/assets/rdf_revised_pcraster_mandalgarh');
var block3 = ee.FeatureCollection('projects/ee-anz208490/assets/rdf_revised_pcraster_mohanpur');
var block4 = ee.FeatureCollection('projects/ee-anz208490/assets/rdf_revised_pcraster_masalia');
var block5 = ee.FeatureCollection('projects/ee-anz208490/assets/rdf_revised_pcraster_angul');

var block_name1 = 'Pindwara'; // 549 -> 6
var block_name2 = 'Mandalgarh'; // 386 -> 4
var block_name3 = 'Mohanpur'; // 128 -> 2
var block_name4 = 'Masalia'; // 666 -> 7
var block_name5 = 'Angul'; // 91 -> 1


var primaryKey = 'uid';

var block = eval('block'+block_slno);
var block_name = eval('block_name'+block_slno);

// block = ee.FeatureCollection(block.toList(10));
print(block)


var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").select('precipitation');
var chirps_available_from_year = 1981; // it is available from 1981-01-01
var chirps_scale = 5566;
var modis_ndvi = ee.ImageCollection("MODIS/MOD09GA_006_NDVI").select('NDVI');
var modis_ndvi_scale = 464;
var modis_ndvi_available_from_year = 2000; // it is available from 2000-02-24
var modis_ndwi = ee.ImageCollection("MODIS/MOD09GA_006_NDWI").select('NDWI');
var modis_ndwi_scale = 464;
var modis_ndwi_available_from_year = 2000; // it is available from 2000-02-24
var landsat = ee.ImageCollection("LANDSAT/LC08/C02/T1_TOA").select(['B4', 'B5', 'B7']);
var landsat_scale = 30;
var landsat_available_from_year = 2013; // it is available from 2013-03-18
var modis = ee.ImageCollection("MODIS/061/MOD16A2GF").select(['ET','PET']);
var modis_scale = 500;
var modis_available_from_year = 2000; // it is available from 2000-01-01
var cur_year_crop_img = ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_' + current_year  + '-07-01_' + (current_year+1)  + '-06-30_LULCmap_10m');

var lulc = ee.List([
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2003-07-01_2004-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2004-07-01_2005-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2005-07-01_2006-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2006-07-01_2007-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2007-07-01_2008-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2008-07-01_2009-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2009-07-01_2010-06-30_LULCmap_10m'),  
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2010-07-01_2011-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2011-07-01_2012-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2012-07-01_2013-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2013-07-01_2014-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2014-07-01_2015-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2015-07-01_2016-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2016-07-01_2017-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2017-07-01_2018-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2018-07-01_2019-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2019-07-01_2020-06-30_LULCmap_10m'),  
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2020-07-01_2021-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2021-07-01_2022-06-30_LULCmap_10m'),
    ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + block_name + '_2022-07-01_2023-06-30_LULCmap_10m'),   
]);
var lulc_scale = 10;
var lulc_available_from_year = 2003;
var lulc_available_till_year = 2022;



var aez = block;
// MapDotAddLayer(aez);
// print(ws.size());

var aez_name = block_name;

function getMonsoonOnSetDate(year, mainRoi){
  var A = ee.Geometry.Polygon([[[69.17606600131256, 37.50688033728282], [69.17606600131256, 26.132493256032653], [82.09598787631256, 26.132493256032653], [82.09598787631256, 37.50688033728282]]], null, false);
  var B = ee.Geometry.Polygon([[[67.68192537631256, 26.148475498372616], [67.68192537631256, 18.36801791110178], [76.00956209506256, 18.36801791110178], [76.00956209506256, 26.148475498372616]]], null, false);
  var E = ee.Geometry.Polygon([[[72.28204341674216, 18.348999397274717], [72.28204341674216, 7.596336766662568], [84.43292232299216, 7.596336766662568], [84.43292232299216, 18.348999397274717]]], null, false);
  var C = ee.Geometry.Polygon([[[76.0413365622055, 26.089074629747927], [76.0413365622055, 18.346936996159776], [82.0398717184555, 18.346936996159776], [82.0398717184555, 26.089074629747927]]], null, false);
  var D = ee.Geometry.Polygon([[[82.15028471689531, 30.784246603238188], [82.15028471689531, 18.390939094394867], [99.33290190439531, 18.390939094394867], [99.33290190439531, 30.784246603238188]]], null, false);
  /* Western(B), Northern(A), Central(C), Eastern(D), Southern(E) regions */
  var HMZs = ee.FeatureCollection([ee.Feature(A), ee.Feature(B), ee.Feature(C), ee.Feature(D), ee.Feature(E)]);
  
  
  var dictionary = ee.Dictionary({
    western: ee.Feature(B),
    northern: ee.Feature(A),
    central: ee.Feature(C),
    eastern: ee.Feature(D),
    southern: ee.Feature(E)
  });
  var thresholds = ee.Dictionary({
    western: 75,
    northern: 75,
    central: 69,
    eastern: 65,
    southern: 50
  });
  
  // print(HMZs.first().geometry().intersection(roi.geometry(), ee.ErrorMargin(1)))
  var intersectionArea = HMZs.map(function(hmz){
    var dummyFeature = ee.Feature(null);
    var area = ee.Feature(hmz).geometry().intersection(mainRoi.geometry(), ee.ErrorMargin(1)).area();
    dummyFeature = dummyFeature.set('area', area);
    return dummyFeature;
  });
  // print(intersectionArea)
  var region_index = ee.Number(ee.Array(intersectionArea.aggregate_array('area')).gt(0).argmax().get(0));
  // print(region_index);
  var mapping = ee.Dictionary({0:'northern', 1:'western', 2:'central', 3:'eastern', 4:'southern'});
  var region = mapping.get(region_index);
  // print(region)
  var roi = ee.Feature(dictionary.get(region)).geometry();
  var threshold = thresholds.get(region);
  
  
  var currentYear = year;
  var startYear = 1981;  
  function onSet(roi, dataset, duration, startYear, bandName, threshold){
    var startDays = ee.List.sequence(0, 365, duration);
    // print(startDays);
    var endDays = ee.List.sequence(duration, 365, duration);
    var weeks = startDays.zip(endDays);
    // print(weeks);

    startYear = ee.Number(startYear);
    // var endYear = ee.Number.parse(ee.Date(Date.now()).format('YYYY')).subtract(ee.Number(1));
    var endYear = currentYear;
    dataset = dataset.filterDate(ee.Date.fromYMD(startYear, 1, 1), ee.Date.fromYMD(endYear, 12, 31));

  
    var weeklyTotals = weeks.map(function(week){
        var filtered = dataset.filter(ee.Filter.calendarRange(ee.List(week).get(0), ee.List(week).get(1), 'day_of_year'));
        var weeklyTotal = filtered.sum();
        return weeklyTotal.set({'day':ee.List(week).get(0)});
    });
    weeklyTotals = ee.ImageCollection.fromImages(weeklyTotals);  
    weeklyTotals = weeklyTotals.map(function(image){
      var value = image.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: roi,
        scale: 5566
      }).get(bandName);
      value = ee.Number(value).divide(ee.Number(endYear).subtract(ee.Number(startYear)).add(ee.Number(1)));
      // value = ee.Number(value);
      var f = ee.Feature(null);
      f = f.set(bandName, value);
      return f;
    });  
    weeklyTotals = weeklyTotals.aggregate_array(bandName);  
    
    var thresholdOrgValues = weeklyTotals.reduce(ee.Reducer.percentile([threshold]));
    // print(thresholdOrgValues);
  
    var firstDerivative = weeklyTotals.slice(1).zip(weeklyTotals.slice(0, -1)).map(function(pair) {
      var difference = ee.Number(ee.List(pair).get(0)).subtract(ee.List(pair).get(1));
      return difference;
    });
    firstDerivative = ee.List([firstDerivative.get(0)]).cat(firstDerivative);
    
    
    function findDate(fortNight, currYear, bandName){
      
      var month = fortNight.divide(ee.Number(4)).floor();
      // var i = fortNight % 2;
      // print(month);
      var i = (fortNight.subtract(1)).mod(4);
      var startDate, endDate;
      // startDate = ee.Algorithms.If(fortNight.gte(16), 16, 1);
      // endDate = ee.Algorithms.If(fortNight.gte(16), 30, 15);
      // startDate = ee.Algorithms.If(i.eq(0), 1
      // , ee.Algorithms.If(i.eq(1), 8
      // , ee.Algorithms.If(i.eq(2), 16
      // , 24)));
      // endDate = ee.Algorithms.If(i.eq(0), 7
      // , ee.Algorithms.If(i.eq(1), 14
      // , ee.Algorithms.If(i.eq(2), 21
      // , 30)));
      var s = ee.Number(ee.List(weeks.get(fortNight)).get(0));
      // print(s);
      startDate = ee.Date.fromYMD(year, 1, 1).advance(s, 'day');
      // print(startDate);
      endDate = startDate.advance(6, 'day');
      // print(startDate, endDate);
      // var filtered = chirps.filterDate(ee.Date.fromYMD(currYear, month, startDate), ee.Date.fromYMD(currYear, month, endDate));
      var filtered = chirps.filterDate(startDate, endDate);
      filtered = filtered.map(function(image){
        var value = image.reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: roi,
          scale: 5566
        }).get(bandName);
        // value = ee.Number(value).divide(ee.Number(currYear).subtract(ee.Number(startYear)).add(ee.Number(1)));
        value = ee.Number(value);
        var f = ee.Feature(null);
        f = f.set(bandName, value);
        return f;
      }); 

      filtered = filtered.aggregate_array(bandName);
      var firstDerivative = filtered.slice(1).zip(filtered.slice(0, -1)).map(function(pair) {
        var difference = ee.Number(ee.List(pair).get(0)).subtract(ee.List(pair).get(1));
        return difference;
      });
      // print("first deri ", firstDerivative);

      var onsetDate = ee.Number(ee.Array(firstDerivative).gt(0).argmax().get(0));
      // print(onsetDate);
      // firstDerivative.evaluate(success, null);
      // return ee.Date.fromYMD(currYear, month.add(1), onsetDate);
      return startDate.advance(onsetDate, 'day');
    }
  
    // print(weeklyTotals);
    // print(thresholdOrgValues);
    var highChangesInWeeklyTotals = weeklyTotals.map(function(element) {
      return ee.Number(element).gte(thresholdOrgValues);
    });
    // print(highChangesInWeeklyTotals);
    var onsetMonth = ee.Number(ee.Array(highChangesInWeeklyTotals.slice(18)).gt(0.100396432).argmax().get(0)).add(ee.Number(18));
    // print(onsetMonth);
    return findDate(onsetMonth, endYear, bandName);
  }
  return onSet(roi, chirps, 7, startYear, 'precipitation', threshold);
}

// now it is static, later make it dynamic
function getMonsoonCessationDate(){
  return ee.Date.fromYMD(current_year, 10, 31);
}

function getWeekStartDates(start_date, end_date){
  // start_date and end_date are ee.Date object 
  
  var delta = end_date.difference(start_date, 'day');
  var sequence = ee.List.sequence(0, delta, 7);
  
  var dates = sequence.map(function(delta){
    return start_date.advance(delta, 'day');
  });
  
  return dates;
}

function getRainfallDeviation(start_date, roi, delta){
  // start_date is ee.Date object
  // roi is ee.FeatureCollection
  // delta is js integer, either 7 or 28
  start_date = ee.Date(start_date); // ensure the type
  roi = ee.FeatureCollection(roi); // ensuret the type
  
  
  var starting_day_of_year = getDayOfYear(start_date);
  var days = ee.List.sequence(starting_day_of_year, starting_day_of_year.add(delta));
  var years = ee.List.sequence(chirps_available_from_year, current_year-1);
  var longterm_mean = ee.ImageCollection(years.map(function(year){
    var yearly_dataset = chirps.filter(ee.Filter.calendarRange(year, year, 'year'));
    return ee.ImageCollection(days.map(function(day){
      return yearly_dataset.filter(ee.Filter.calendarRange(day)).sum();
    })).sum();
  })).mean();
  var current_year_value = ee.ImageCollection(days.map(function(day){
    return chirps.filter(ee.Filter.calendarRange(current_year, current_year, 'year')).filter(ee.Filter.calendarRange(day, day, 'day_of_year')).sum();
  })).sum();
  
  var rainfalldeviation = (current_year_value.subtract(longterm_mean)).divide(longterm_mean);
  // print(rainfalldeviation);
  roi = rainfalldeviation.reduceRegions(roi, ee.Reducer.mean(), 5566);
  roi = roi.map(function(feature){
    return feature.set('mean', ee.Number(feature.get('mean')).multiply(100));
  });
  // roi = rainfalldeviation.reduceRegions(roi, ee.Reducer.mean(), 5566, crs, crsTransform, tileScale)
  if(delta==7){
    roi = renameColumn('mean', concat('weekly_rainfall_deviation_', date2str(start_date)), roi);
    // return renameColumn('mean', concat('weekly_rainfall_deviation_', ''), roi);
    // roi = renameColumn('mean', 'weekly_rainfall_deviation_', roi);
  }else if(delta==28){
    roi = renameColumn('mean', concat('monthly_rainfall_deviation_', date2str(start_date)), roi);
    // roi = renameColumn('mean', 'monthly_rainfall_deviation_', roi);
  }
  // roi = renameColumn('mean', 'rainfall_deviation', roi);
  // print(roi);
  return roi;
}

function getWeeklyDeviationForDrySpell(start, end, roi){
  var days = ee.List.sequence(start, end);
  var years = ee.List.sequence(chirps_available_from_year, current_year-1);
  var longterm_mean = ee.ImageCollection(years.map(function(year){
    var yearly_dataset = chirps.filter(ee.Filter.calendarRange(year, year, 'year'));
    return ee.ImageCollection(days.map(function(day){
      return yearly_dataset.filter(ee.Filter.calendarRange(day)).sum();
    })).sum();
  })).mean();
  var current_year_value = ee.ImageCollection(days.map(function(day){
    return chirps.filter(ee.Filter.calendarRange(current_year, current_year, 'year')).filter(ee.Filter.calendarRange(day, day, 'day_of_year')).sum();
  })).sum();
  
  var rainfalldeviation = (current_year_value.subtract(longterm_mean)).divide(longterm_mean);  
  // print(rainfalldeviation);
  
  roi = rainfalldeviation.reduceRegions(roi, ee.Reducer.mean(), 5566);
  roi = roi.map(function(feature){
    return feature.set('mean', ee.Number(feature.get('mean')).multiply(100));
  });
  
  // print(roi);
  return roi;
}

function drySpellLable(value){
  value = ee.Number(value);
  return ee.Algorithms.If(value.lte(-50), 1, 0);
}

function getMonthlyDrySpell(start_date, roi){
  
  var w1s = getDayOfYear(start_date);
  var w2s = w1s.add(7);
  var w3s = w1s.add(14);
  var w4s = w1s.add(21);
  
  var w1e = w1s.add(6);
  var w2e = w2s.add(6);
  var w3e = w3s.add(6);
  var w4e = w4s.add(6);
  
  // print(w1s, w1e);
  // print(w2s, w2e);
  // print(w3s, w3e);
  // print(w4s, w4e);
  var w1dev = getWeeklyDeviationForDrySpell(w1s, w1e, roi).aggregate_array('mean').map(drySpellLable);
  var w2dev = getWeeklyDeviationForDrySpell(w2s, w2e, roi).aggregate_array('mean').map(drySpellLable);
  var w3dev = getWeeklyDeviationForDrySpell(w3s, w3e, roi).aggregate_array('mean').map(drySpellLable);
  var w4dev = getWeeklyDeviationForDrySpell(w4s, w4e, roi).aggregate_array('mean').map(drySpellLable);
  // print(w1dev, w2dev, w3dev, w4dev);
    
  // Convert arrays to ee.List
  var w1EE = ee.List(w1dev);
  var w2EE = ee.List(w2dev);
  var w3EE = ee.List(w3dev);
  var w4EE = ee.List(w4dev);
  
  // Perform element-wise logical AND
  var zippedList = w1EE.zip(w2EE).zip(w3EE).zip(w4EE);
  // print(zippedList);
  var dryspell = zippedList
    .map(function(item) {
      var w1Val = ee.Number(ee.List(ee.List(ee.List(item).get(0)).get(0)).get(0));
      var w2Val = ee.Number(ee.List(ee.List(ee.List(item).get(0)).get(0)).get(1));
      var w3Val = ee.Number(ee.List(ee.List(item).get(0)).get(1));
      var w4Val = ee.Number(ee.List(item).get(1));
  
      return w1Val.and(w2Val).and(w3Val).and(w4Val);
    });
  
  // Print the result
  // print(dryspell); 
  
  var roi_dryspell_zip = roi.toList(roi.size()).zip(dryspell);
  
  roi = roi_dryspell_zip.map(function(list){
    list = ee.List(list);
    var feature = ee.Feature(list.get(0));
    var ds = ee.Number(list.get(1));
    feature = feature.set(concat('dryspell_', date2str(start_date)), ds);
    return feature;
  });
  
  roi = ee.FeatureCollection(roi);
  return roi;
}

function getSPI(start_date, roi){
  // start_date is ee.Date object
  // roi is ee.FeatureCollection
  start_date = ee.Date(start_date); // ensure the type
  roi = ee.FeatureCollection(roi); // ensuret the type
  var delta = 28; // Computing SPI-1
  
  
  var starting_day_of_year = getDayOfYear(start_date);
  var days = ee.List.sequence(starting_day_of_year, starting_day_of_year.add(delta));
  var years = ee.List.sequence(chirps_available_from_year, current_year-1);
  
  var longterm_mean = ee.ImageCollection(years.map(function(year){
    var yearly_dataset = chirps.filter(ee.Filter.calendarRange(year, year, 'year'));
    return ee.ImageCollection(days.map(function(day){
      return yearly_dataset.filter(ee.Filter.calendarRange(day)).mean();
    })).sum();
  })).reduce(ee.Reducer.mean());
  // print('longterm_mean', longterm_mean);
  var longterm_stddev = ee.ImageCollection(years.map(function(year){
    var yearly_dataset = chirps.filter(ee.Filter.calendarRange(year, year, 'year'));
    return ee.ImageCollection(days.map(function(day){
      return yearly_dataset.filter(ee.Filter.calendarRange(day)).mean();
    })).sum();
  })).reduce(ee.Reducer.stdDev());
  // print('longterm_stddev', longterm_stddev);
  
  var current_year_value = ee.ImageCollection(days.map(function(day){
    return chirps.filter(ee.Filter.calendarRange(current_year, current_year, 'year')).filter(ee.Filter.calendarRange(day, day, 'day_of_year')).sum();
  })).reduce(ee.Reducer.mean());
  
  var spi = current_year_value.select('precipitation_mean').subtract(longterm_mean.select('precipitation_mean'));
  spi = spi.divide(longterm_stddev.select('precipitation_stdDev')).rename('spi');
  // print(spi);
  
  roi = spi.reduceRegions(roi, ee.Reducer.mean(), 5566);
  roi = renameColumn('mean', concat('spi_', date2str(start_date)), roi);
  
  return roi;
}

function getKharifCroppingPixelMask(aez){
  var single_kharif = ee.Image.constant(0);
  var single_non_kharif = ee.Image.constant(0);
  var double = ee.Image.constant(0);
  var triple = ee.Image.constant(0);

  // for(var year=lulc_available_from_year ; year<=current_year ; year++){
  //   single_kharif = single_kharif.or(ee.Image(lulc.get(year-lulc_available_from_year)).select('predicted_label').eq(9));
  //   single_non_kharif = single_non_kharif.or(ee.Image(lulc.get(year-lulc_available_from_year)).select('predicted_label').eq(10));
  //   double = double.or(ee.Image(lulc.get(year-lulc_available_from_year)).select('predicted_label').eq(11));
  //   triple = triple.or(ee.Image(lulc.get(year-lulc_available_from_year)).select('predicted_label').eq(12));
  // }
  var year=current_year;
  single_kharif = single_kharif.or(ee.Image(lulc.get(year-lulc_available_from_year)).select('predicted_label').eq(9));
  single_non_kharif = single_non_kharif.or(ee.Image(lulc.get(year-lulc_available_from_year)).select('predicted_label').eq(10));
  double = double.or(ee.Image(lulc.get(year-lulc_available_from_year)).select('predicted_label').eq(11));
  triple = triple.or(ee.Image(lulc.get(year-lulc_available_from_year)).select('predicted_label').eq(12));
  
  // MapDotAddLayer(single_kharif);
  
  var kharif = single_kharif.or(double).or(triple);
  var mask = kharif.clip(aez.geometry());
  
  // MapDotAddLayer(mask);
  return mask;
}


function getPercentageOfAreaCropped(roi){
  var single_kharif = ee.Image.constant(0);
  var single_non_kharif = ee.Image.constant(0);
  var double = ee.Image.constant(0);
  var triple = ee.Image.constant(0);

  for(var year=lulc_available_from_year ; year<=current_year ; year++){
    single_kharif = single_kharif.or(ee.Image(lulc.get(year-lulc_available_from_year)).select('predicted_label').eq(9));
    single_non_kharif = single_non_kharif.or(ee.Image(lulc.get(year-lulc_available_from_year)).select('predicted_label').eq(10));
    double = double.or(ee.Image(lulc.get(year-lulc_available_from_year)).select('predicted_label').eq(11));
    triple = triple.or(ee.Image(lulc.get(year-lulc_available_from_year)).select('predicted_label').eq(12));
  }
  // MapDotAddLayer(single_kharif);
  var kharif_cropable = single_kharif.or(double).or(triple);
  
  var current_year_single_kharif = cur_year_crop_img.select('predicted_label').eq(9);
  var current_year_single_non_kharif = cur_year_crop_img.select('predicted_label').eq(10);
  var current_year_double = cur_year_crop_img.select('predicted_label').eq(11);
  var current_year_triple = cur_year_crop_img.select('predicted_label').eq(12);
  

  var kharif_cropped = current_year_single_kharif.or(current_year_double).or(current_year_triple);
  
  // var kharif_ = kharif_cropped.reduceRegions(roi, ee.Reducer.sum(), lulc_scale, crs, crsTransform, tileScale)
  roi = kharif_cropable.reduceRegions(roi, ee.Reducer.sum(), lulc_scale);
  var args = ee.Dictionary();
  args = args.set('scale', lulc_scale);
  roi = renameColumnWithTransformation('sum', 'kharif_croppable_sqkm', roi, sqm2sqkm, args);
  
  roi = kharif_cropped.reduceRegions(roi, ee.Reducer.sum(), lulc_scale);
  roi = renameColumnWithTransformation('sum', 'kharif_cropped_sqkm_'+current_year, roi, sqm2sqkm, args);
  
  roi = roi.map(function(feature){
    var numerator = ee.Number(feature.get('kharif_cropped_sqkm_'+current_year));
    var denomenator = ee.Number(feature.get('kharif_croppable_sqkm'));
    var percent_of_area_cropped_cur_year_kharif = numerator.divide(denomenator);
    percent_of_area_cropped_cur_year_kharif = percent_of_area_cropped_cur_year_kharif.multiply(100);
    feature = feature.set('percent_of_area_cropped_kharif_'+current_year, percent_of_area_cropped_cur_year_kharif);
    return feature;
  });
  
  // print(roi);
  return roi;
}


function getMonthlyVCI(start_date, roi, croppingMask){
  // start_date is ee.Date object
  // roi is ee.FeatureCollection
  start_date = ee.Date(start_date); // ensure the type
  roi = ee.FeatureCollection(roi); // ensuret the type
  
  // delta is js integer, adjust delta according to ndvi availability
  var delta = 28;
  
  var starting_day_of_year = getDayOfYear(start_date);
  // var years_ndvi = ee.List.sequence(modis_ndvi_available_from_year, current_year-1);
  // var years_ndwi = ee.List.sequence(modis_ndwi_available_from_year, current_year-1);
  
  var years_ndvi = ee.List.sequence(modis_ndvi_available_from_year, current_year);
  var years_ndwi = ee.List.sequence(modis_ndwi_available_from_year, current_year);

  
  var start = starting_day_of_year;
  var end = start.add(delta);
  var ndvis = years_ndvi.map(function(year){
    return modis_ndvi.filter(ee.Filter.calendarRange(year, year, 'year'))
                    .filter(ee.Filter.calendarRange(start, end, 'day_of_year'))
                    .select('NDVI')
                    .mean();
  });
  ndvis = ee.ImageCollection(ndvis);
  var ndvi_cur = modis_ndvi.filter(ee.Filter.calendarRange(current_year, current_year, 'year'))
                        .filter(ee.Filter.calendarRange(start, end, 'day_of_year'))
                        .select('NDVI')
                        .mean();
  // print("ndvis: ", ndvis);
  // print("ndvi_cur: ", ndvi_cur);
  var ndwis = years_ndwi.map(function(year){
    return modis_ndwi.filter(ee.Filter.calendarRange(year, year, 'year'))
                    .filter(ee.Filter.calendarRange(start, end, 'day_of_year'))
                    .select('NDWI')
                    .mean();
  });
  ndwis = ee.ImageCollection(ndwis);
  var ndwi_cur = modis_ndwi.filter(ee.Filter.calendarRange(current_year, current_year, 'year'))
                        .filter(ee.Filter.calendarRange(start, end, 'day_of_year'))
                        .select('NDWI')
                        .mean();
  
  var ndvi_min = ndvis.reduce(ee.Reducer.min());
  var ndvi_max = ndvis.reduce(ee.Reducer.max());
  // print("ndvi_min: ",ndvi_min)
  var vci_ndvi_numerator = ndvi_cur.select('NDVI').subtract(ndvi_min.select('NDVI_min'));
  var vci_ndvi_denomenator = ndvi_max.select('NDVI_max').subtract(ndvi_min.select('NDVI_min'));
  var vci_ndvi = (vci_ndvi_numerator.select('NDVI')).divide(vci_ndvi_denomenator.select('NDVI_max'));
  
  // print('ndvi_min', ndvi_min);
  // print('ndvi_max', ndvi_max);
  // print('vci_ndvi_numerator', vci_ndvi_numerator);
  // print('vci_ndvi_denomenator', vci_ndvi_denomenator);
  // print('vci_ndvi', vci_ndvi);
  
  var ndwi_min = ndwis.reduce(ee.Reducer.min());
  var ndwi_max = ndwis.reduce(ee.Reducer.max());
  var vci_ndwi_numerator = ndwi_cur.select('NDWI').subtract(ndwi_min.select('NDWI_min'));
  var vci_ndwi_denomenator = ndwi_max.select('NDWI_max').subtract(ndwi_min.select('NDWI_min'));
  var vci_ndwi = (vci_ndwi_numerator.select('NDWI')).divide(vci_ndwi_denomenator.select('NDWI_max'));
  
  // print('ndwi_min', ndwi_min);
  // print('ndwi_max', ndwi_max);
  // print('vci_ndwi_numerator', vci_ndwi_numerator);
  // print('vci_ndwi_denomenator', vci_ndwi_denomenator);
  // print('vci_ndwi', vci_ndwi  );
  
  var vci = vci_ndvi.min(vci_ndwi);

  vci = ee.Image(vci).multiply(croppingMask);
  vci = vci.multiply(100);
  // print('vci', vci);
  
  // roi = vci.reduceRegions(roi, ee.Reducer.mean(), modis_ndvi_scale);
  roi = vci.reduceRegions(roi, ee.Reducer.sum(), modis_ndvi_scale);
  var pc = croppingMask.reduceRegions(roi, ee.Reducer.sum(), modis_ndvi_scale);
  roi = roi.map(function(feature){
    var pkid = feature.get(primaryKey);
    var f1=ee.Feature(pc.filter(ee.Filter.eq(primaryKey, pkid)).first());
    var nume = feature.get('sum');
    var deno = f1.get('sum');
    nume=ee.Number(nume);
    deno=ee.Number(deno);
    var vci_value = nume.divide(deno);
    feature = feature.set(concat('vci_', date2str(start_date)), vci_value);
    
    // var et_ = ee.Feature(feature).get(concat('et_', date2str(start_date)));
    // var pet_ = ee.Feature(feature).get(concat('pet_', date2str(start_date)));
    // var mai_ = ee.Number(et_).divide(ee.Number(pet_));
    // mai_ = mai_.multiply(100);
    return feature;
  });
  
  // print(roi);
  // roi = renameColumn('mean', concat('vci_', date2str(start_date)), roi);
  
  // print(roi);
  return roi;
}

function calculateWeight(imageDate, start, end) {
  imageDate = ee.Date(imageDate);
  start = ee.Date.fromYMD(current_year, 1, 1).advance(start.subtract(1), 'day');
  end = ee.Date.fromYMD(current_year, 1, 1).advance(end.subtract(1), 'day');
  
  var s = imageDate.advance(-8, 'day');
  var e = imageDate;
  
  // print(s, e);
  // print(start, end);
  
  // Find the start and end of the overlapping region
  var s1=s, e1=e;
  var s2=start, e2=end;
  var s1millis = s1.millis();
  var e1millis = e1.millis();
  var s2millis = s2.millis();
  var e2millis = e2.millis();
  
  // Find the start and end of the overlapping region
  var startOverlapMillis = s1millis.max(s2millis);
  var endOverlapMillis = e1millis.min(e2millis);
  
  var startOverlap = ee.Date(ee.Algorithms.If(startOverlapMillis.eq(s1millis), s1, s2));
  var endOverlap = ee.Date(ee.Algorithms.If(endOverlapMillis.eq(e1millis), e1, e2));
  
  // print(startOverlap, endOverlap);
  
  // Calculate the length of the overlapping region in days
  var overlapLength = endOverlap.difference(startOverlap, 'day').add(1);
  overlapLength = overlapLength.min(8);
  
  // Print the result
  // print('Overlap Length:', overlapLength); 
  
  var weight = overlapLength.divide(8);
  
  return weight;
};

function getMonthlyMAI(start_date, roi, croppingMask){
  // start_date is ee.Date object
  // roi is ee.FeatureCollection
  start_date = ee.Date(start_date); // ensure the type
  // var end_date = ee.Date.fromYMD(start_date.get('year'), 1, 1).advance(end.subtract(1), 'day');
  // print(start_date, end_date);
  roi = ee.FeatureCollection(roi); // ensuret the type
  
  // delta is js integer, adjust delta according to ndvi availability
  var delta = 28;

  var start = getDayOfYear(start_date);
  var end = start.add(delta);
  var takeImagesTill = start.add(delta+7); // take one more images because, for the last interval, 
                                           // the data will come from the image which is out of the interval
  

  var data = modis
             .filter(ee.Filter.calendarRange(current_year, current_year, 'year'))
             .filter(ee.Filter.calendarRange(start, takeImagesTill, 'day_of_year'));
  
  var et = data.select('ET');
  var pet = data.select('PET');
  // get the dates of the images of modis
  var dates = et.aggregate_array('system:index').map(function(date){return ee.Date.parse('Y_M_d', ee.String(date))});
  // print(dates);
  
  // compute the weight of each image
  //  but, for example if start is 2nd july and end is 26th july and modis image is 
  // available at 4th, 12th, 20th and 28th then multiply the image obtained at 4thjuly 
  // by 2/8 as 2days of 8days have to be taken for the first image and multiply by 6/8 
  // the last image i.e. the image obtained by 28th july as 6days out of 8days are 
  // falling in the start and end (both inclusive). 
  var weights = dates.map(function(date){
    return calculateWeight(date, start, end);
  });
  // print(weights);
  
  var et_w = et.toList(et.size()).zip(weights);  
  var pet_w = pet.toList(pet.size()).zip(weights);
  
  
  var new_et = et_w.map(function(list){
    list = ee.List(list);
    var img = ee.Image(list.get(0));
    var weight = ee.Number(list.get(1));
    return ((img.multiply(weight)).multiply(0.1)).toDouble();
    
    // return img.multiply(weight); // not working
    // return img; // working
    // return img.multiply(weight).multiply(0.1); // not working
  });
  new_et = ee.ImageCollection(new_et).sum();
  
  var new_pet = pet_w.map(function(list){
    list = ee.List(list);
    var img = ee.Image(list.get(0));
    var weight = ee.Number(list.get(1));
    return ((img.multiply(weight)).multiply(0.1)).toDouble();
    
    // return img.multiply(weight); // not working
    // return img; // working
    // return img.multiply(weight).multiply(0.1); // not working
  });
  new_pet = ee.ImageCollection(new_pet).sum();
  
  // print(et);
  // print(pet);

  new_et = ee.Image(new_et).multiply(croppingMask);
  new_pet = ee.Image(new_pet).multiply(croppingMask);
  
  roi = new_et.reduceRegions(roi, ee.Reducer.sum(), modis_scale);
  roi = renameColumn('sum', concat('et_', date2str(start_date)), roi);
  // print(roi);
  
  roi = new_pet.reduceRegions(roi, ee.Reducer.sum(), modis_scale);
  roi = renameColumn('sum', concat('pet_', date2str(start_date)), roi);
  // print(roi);
  // var pc = croppingMask.reduceRegions(roi, ee.Reducer.sum(), modis_scale);
  roi = roi.map(function(feature){
    // var pkid = feature.get(primaryKey);
    // var f1=ee.Feature(pc.filter(ee.Filter.eq(primaryKey, pkid)).first());
    
    // var deno = f1.get('sum');
    // deno=ee.Number(deno);
    
    
    var et_ = ee.Feature(feature).get(concat('et_', date2str(start_date)));
    var pet_ = ee.Feature(feature).get(concat('pet_', date2str(start_date)));
    
    // et_ = ee.Number(et_);
    // pet_ = ee.Number(pet_);
    // et_ = et_.divide(deno);
    // pet_ = pet_.divide(deno);
    
    var mai_ = ee.Number(et_).divide(ee.Number(pet_));
    mai_ = mai_.multiply(100);
    feature = feature.set(concat('mai_', date2str(start_date)), mai_);
    return feature;
  });
  
  
  // if we do mai=et.divide(pet) and then do reduceregions on mai then 
  
  // print(roi);
  return roi;
}

// aez, 'dryspell_', true, monthly_dryspells, start_dates, 0
function join(roi, to_pick, weekly, fc_of_fc, start_dates, index){
  // roi = roi.toList(roi.size());
  // roi:ee.List -> result will be written over this
  // to_pick:js string -> pick to_pick from the source
  // fc_of_fc: ee.FeatureCollection of ee.FeatureCollection
  // start_dates:ee.List of ee.Date
  // index: pick fc_of_fc.get(index) and start_dates.get(index)
  // if weekly is true then use start_dates otherwise there is a single value of the entire season
  
  if(weekly==true){
    roi = ee.List(roi); // ensure the type
    
    var fc = ee.FeatureCollection(ee.FeatureCollection(fc_of_fc).toList(fc_of_fc.size()).get(index));
    fc = fc.toList(fc.size());
    
    var date = ee.Date(start_dates.get(index));
    var zipped = roi.zip(fc);
    // print(zipped);
    
    var result = zipped.map(function(list){
      list = ee.List(list);
      var f1 = ee.Feature(list.get(0));
      var f2 = ee.Feature(list.get(1));
      var value = f2.get(concat(to_pick, date2str(date)));
      f1 =  f1.set(concat(to_pick, date2str(date)), value);
      return f1;
    });
    
    return result;
    // result = ee.FeatureCollection(result);
    // print(result);
  }else{
    roi = ee.List(roi); // ensure the type
    
    // var fc = ee.FeatureCollection(ee.FeatureCollection(fc_of_fc).toList(fc_of_fc.size()).get(index));
    // fc = fc.toList(fc.size());
    var fc = fc_of_fc.toList(fc_of_fc.size());
    
    var zipped = roi.zip(fc);
    // print(zipped);
    
    var result = zipped.map(function(list){
      list = ee.List(list);
      var f1 = ee.Feature(list.get(0));
      var f2 = ee.Feature(list.get(1));
      var value = f2.get(to_pick);
      f1 =  f1.set(to_pick, value);
      return f1;
    });
    
    // result = ee.FeatureCollection(result);
    // print(result);
    
    return result;
  }
}

/****************************
Rainfall Deviation Table
------------------------
if rainfalldev '+19 to -19' then 'Normal rf'
if rainfalldev '-20 to -59' then 'Deficit rf'
if rainfalldev '-60 to -100' then 'Scanty rf'
*****************************/
function rfDevTable(rfdev){
  rfdev = ee.Number(rfdev);
  return ee.Algorithms.If(rfdev.gte(-19), 
                            'Normal rf',
                             ee.Algorithms.If(rfdev.gte(-59), 'Deficit rf', 
                                              'Scanty rf'
                                             )
                         );
                         
}

/*
VCI Value (%) Vegetation Condition
60-100 Good
40-60 Fair
0-40 Poor
*/
function vciTable(vci){
  // returns 3 if severe
  //         2 if moderate
  //         1 otherwise
  // vci is not available at all places, in that case vci is returned as 1
  
  vci = ee.Number(vci);
  return ee.Algorithms.If(vci,
                          ee.Algorithms.If(vci.lte(40), 
                                          3, 
                                          ee.Algorithms.If(vci.lte(60),
                                                           2,
                                                           1
                                                           )
                                          ),
                          1
  );
}

/*
MAI (%) Agricultural Drought Class
76 – 100 No drought
51-75 Mild drought
26-50 Moderate drought
0-25 Severe drought
*/
function maiTable(mai){
  // returns 3 if severe
  //         2 if moderate
  //         1 otherwise
  mai = ee.Number(mai);
  
  return ee.Algorithms.If(mai.lte(25), 
                          3, 
                          ee.Algorithms.If(mai.lte(50),
                                           2,
                                           1
                                           )
                          );
}

/*
Area Sown(%) Drought Condition
0-33.3 Severe drought
33.3-50 Moderate drought
50-100 Mild or No drought
*/
function pasTable(pas){
  // returns 3 if severe
  //         2 if moderate
  //         1 otherwise
  pas = ee.Number(pas);
  
  return ee.Algorithms.If(pas.lte(33.3), 
                          3, 
                          ee.Algorithms.If(pas.lte(50),
                                           2,
                                           1
                                           )
                          );
}

/*************************************************
('Rf Dev/SPI', 'Dry spell', 'Drought trigger')
-----------------------------------------------
if 'Deficit or scanty rf/SPI<-1' and 'Yes' then 'Yes'
if 'Deficit or scanty rf/SPI<-1' and 'No' then 'Yes if rainfall is scanty or SPI<-1.5, else No'
if 'Normal rf/SPI>-1' and 'Yes' then 'Yes'
if 'Normal rf/SPI>-1' and 'No' then 'No'
*************************************************/
function getMeteorologicalDrought(start_date, roi){
  // start_date: ee.Date
  // roi: ee.FeatureCollection
  // roi must contain the following columns
  //     dryspell_<start_date>
  //     spi_<start_date>
  //     monthly_rainfall_deviation_<start_date>
  
  roi = ee.FeatureCollection(roi); // ensure the type
  start_date = ee.Date(start_date); // ensure the type 
  roi = roi.map(function(feature){
    var rf_dev = rfDevTable(feature.get(concat('monthly_rainfall_deviation_', date2str(start_date))));
    feature = feature.set(concat('rfdev_class_', date2str(start_date)), rf_dev);
    return feature;
  });
  
  roi = roi.map(function(feature){
    var dryspell_col = concat('dry_spell_', date2str(start_date));
    var rfdev_col = concat('rfdev_class_', date2str(start_date));
    var spi_col = concat('spi_', date2str(start_date));
    
    var dryspell_value = feature.get(dryspell_col);
    var rfdev_value = feature.get(rfdev_col);
    var spi_value = ee.Number(feature.get(spi_col));
    
    /*
    if normal rf:
        if dryspell:
            md = 1
        otherwise:
            md = 0
    otherwise:
        if dryspell:
            md = 1
        otherwise:
            if scanty rf:
                md = 1
            else if spi<-1.5:
                md = 1
            otherwise:
                md = 0

    */
    
    // return feature;

    var normalRF = ee.Algorithms.IsEqual(rfdev_value, 'Normal rf');
    var dryspellCondition = ee.Algorithms.IsEqual(dryspell_value, 1);
    var scantyRF = ee.Algorithms.IsEqual(rfdev_value, 'Scanty rf');
    var spiCondition = spi_value.lt(-1.5);

    var md = ee.Algorithms.If(
        dryspellCondition,
        1,
        ee.Algorithms.If(
            scantyRF,
            1,
            ee.Algorithms.If(
                spiCondition,
                1,
                0
            )
        )
    );

    // Add the 'md' property to the feature
    feature = feature.set(concat('meteorological_drought_', date2str(start_date)), md);
    
    return feature;

  });
  
  
  
  return roi;
}

function getDrought(start_date, roi){
  // start_date: ee.Date
  // roi: ee.FeatureCollection
  // roi must contain the following columns
  //     meteorological_drought_<start_date>
  //     mai_<start_date>
  //     vci_<start_date>
  //     percent_of_area_cropped_kharif_<current_year>
  
  start_date = ee.Date(start_date); // ensure the type 
  
  roi = roi.map(function(feature){
    /*
    
    severe_value = 0
    moderate_value = 0
    if mai is severe:
        severe_value++
    else if mai is moderate:
        moderate_value++
    
    if vci is severe:
        severe_value++
    else if vci is moderate:
        moderate_value++
    
    if pas is severe:
        severe_value++
    else if pas is moderate:
        moderate_value++
    
    if md == 1:
        if severe_value==3:
            d = 3
        else if moderate_value>=2:
            d = 2
        else:
            d = 1
    else:
        d = 0
        
    */
    var vci_value = ee.Number(feature.get(concat('vci_', date2str(start_date))));
    var mai_value = ee.Number(feature.get(concat('mai_', date2str(start_date))));
    var pas_value = ee.Number(feature.get('percent_of_area_cropped_kharif_'+current_year));
    var md = ee.Number(feature.get(concat('meteorological_drought_', date2str(start_date))));
    
    var vci_class = ee.Number(vciTable(vci_value)); 
    var mai_class = ee.Number(maiTable(mai_value)); 
    var pas_class = ee.Number(pasTable(pas_value)); 
    
    var numof_indicators_denoting_severe = ee.Number(0);
    var numof_indicators_denoting_moderate = ee.Number(0);
    
    numof_indicators_denoting_severe = numof_indicators_denoting_severe.add(ee.Algorithms.If(vci_class.eq(3), 1, 0));
    numof_indicators_denoting_severe = numof_indicators_denoting_severe.add(ee.Algorithms.If(mai_class.eq(3), 1, 0));
    numof_indicators_denoting_severe = numof_indicators_denoting_severe.add(ee.Algorithms.If(pas_class.eq(3), 1, 0));

    numof_indicators_denoting_moderate = numof_indicators_denoting_moderate.add(ee.Algorithms.If(vci_class.eq(2), 1, 0));
    numof_indicators_denoting_moderate = numof_indicators_denoting_moderate.add(ee.Algorithms.If(mai_class.eq(2), 1, 0));
    numof_indicators_denoting_moderate = numof_indicators_denoting_moderate.add(ee.Algorithms.If(pas_class.eq(2), 1, 0));
    
    var drought = ee.Algorithms.If(md.eq(0), 
                                   0, 
                                   ee.Algorithms.If(numof_indicators_denoting_severe.eq(3), 
                                                    3,
                                                    ee.Algorithms.If(numof_indicators_denoting_moderate.gte(2),
                                                                     2,
                                                                     1
                                                                     )
                                                    ) 
                  );
                  
    feature = feature.set(concat('drought_', date2str(start_date)), drought);
    return feature;
  });
  
  return roi;
}

function getWeeklyLabels(date, start, roi){
  date = ee.Date(date);
  start = ee.Date(start);
  roi = ee.FeatureCollection(roi);
  
  // print(date);
  // print(start);
  var startMillis = start.millis();
  var date1 = date;
  var date2 = date.advance(-7, 'day');
  var date3 = date.advance(-14, 'day');
  var date4 = date.advance(-21, 'day');
  
  var date1Millis = date1.millis();
  var date2Millis = date2.millis();
  var date3Millis = date3.millis();
  var date4Millis = date4.millis();
  // print(date1, date2, date3, date4);
  
  // print(date1Millis, date2Millis, date3Millis, date4Millis);
  
  date1 = ee.Algorithms.If(startMillis.lt(date1Millis), date1, start);
  date2 = ee.Algorithms.If(startMillis.lt(date2Millis), date2, start);
  date3 = ee.Algorithms.If(startMillis.lt(date3Millis), date3, start);
  date4 = ee.Algorithms.If(startMillis.lt(date4Millis), date4, start);
  // print(date1, date2, date3, date4);
  
  roi = roi.map(function(feature){
    var value1 = ee.Number(feature.get(concat('drought_', date2str(date1))));
    var value2 = ee.Number(feature.get(concat('drought_', date2str(date2))));
    var value3 = ee.Number(feature.get(concat('drought_', date2str(date3))));
    var value4 = ee.Number(feature.get(concat('drought_', date2str(date4))));
    
    var weekly_label = value1.max(value2).max(value3).max(value4);
    
    feature = feature.set(concat('weekly_label_', date2str(date)), weekly_label);
    return feature;
  });
  return roi;
}

function getWeeklyFreqOfDiffTypesOfDrought(start_dates, roi){
  roi = roi.map(function(feature){
    var drought_labels = start_dates.iterate(function(date, prev){
      prev = ee.List(prev);
      var drought_label = feature.get(concat('weekly_label_', date2str(date)));
      prev = prev.add(drought_label);
      return prev;
    }, ee.List([]));
    drought_labels = ee.List(drought_labels);
    var total_weeks = drought_labels.size();
    
    var number_of_weeks_in_no_drought = drought_labels.filter(ee.Filter.eq('item', 0)).size();
    var number_of_weeks_in_mild_drought = drought_labels.filter(ee.Filter.eq('item', 1)).size();
    var number_of_weeks_in_moderate_drought = drought_labels.filter(ee.Filter.eq('item', 2)).size();
    var number_of_weeks_in_severe_drought = drought_labels.filter(ee.Filter.eq('item', 3)).size();
    
    feature = feature.set('total_weeks_'+current_year, total_weeks);
    feature = feature.set('number_of_weeks_in_no_drought_'+current_year, number_of_weeks_in_no_drought);
    feature = feature.set('number_of_weeks_in_mild_drought_'+current_year, number_of_weeks_in_mild_drought);
    feature = feature.set('number_of_weeks_in_moderate_drought_'+current_year, number_of_weeks_in_moderate_drought);
    feature = feature.set('number_of_weeks_in_severe_drought_'+current_year, number_of_weeks_in_severe_drought);
    feature = feature.set('drought_labels_'+current_year, ee.String.encodeJSON(drought_labels));
    return feature;
  });
  return roi;
}


function getDroughtFreqIntensity(roi, threshold){
  var th = threshold;
  threshold = ee.Number(threshold);
  
  roi = roi.map(function(feature){
    var weekly_labels = feature.get('drought_labels_'+current_year);
    weekly_labels = ee.String(weekly_labels).decodeJSON();
    weekly_labels = ee.List(weekly_labels);
    
    var list = weekly_labels.filter(ee.Filter.gte('item', threshold));
    // feature = feature.set('drought_labels_th_'+th+'_'+current_year, ee.String.encodeJSON(list));
    var freq = weekly_labels.filter(ee.Filter.gte('item', threshold)).size();
    var intensity = weekly_labels.filter(ee.Filter.gte('item', threshold));
    intensity = ee.List(intensity);
    intensity = intensity.reduce(ee.Reducer.sum());
    intensity = ee.Number(intensity).divide(freq);
    
    feature = feature.set('freq_of_drought_'+current_year+'_at_threshold_'+th, freq);
    feature = feature.set('intensity_of_drought_'+current_year+'_at_threshold_'+th, intensity);
    return feature;
    
  });
  
  return roi;
}


/************* COMPUTATION START *************/
var monsoon_onset = getMonsoonOnSetDate(current_year, aez);
var monsoon_cessation = getMonsoonCessationDate(); // 30th oct
// print('monsoon onset', monsoon_onset);
// print('monsoon cessation', monsoon_cessation);

var start_dates = getWeekStartDates(monsoon_onset, monsoon_cessation);
print('start_dates', start_dates);

var weekly_rainfall_deviations = start_dates.map(function(date){
  return getRainfallDeviation(date, aez, 7);
});
// print(weekly_rainfall_deviations);

var monthly_dryspells = start_dates.map(function(date){
  return getMonthlyDrySpell(date, aez);
});
// print('monthly_dryspells', monthly_dryspells);
// print(getMonthlyDrySpell(start_dates.get(0), aez));

var monthly_rainfall_deviations = start_dates.map(function(date){
  return getRainfallDeviation(date, aez, 28);
});
// print('monthly_rainfall_deviations', monthly_rainfall_deviations);

var monthly_spis = start_dates.map(function(date){
  return getSPI(date, aez);
});
// print('monthly_spis', monthly_spis);

var croppingPixelMask = getKharifCroppingPixelMask(aez);

var percentage_of_area_sown = getPercentageOfAreaCropped(aez);
// print('percentage_of_area_sown', percentage_of_area_sown);

var monthly_vcis = start_dates.map(function(date){
  return getMonthlyVCI(date, aez, croppingPixelMask);
});
// print('monthly_vcis', monthly_vcis);

var monthly_mais = start_dates.map(function(date){
  return getMonthlyMAI(date, aez, croppingPixelMask);
});
// print('monthly_mais', monthly_mais);

var aez_copy = aez;

aez = aez.map(function(feature){
  feature = feature.set('monsoon_onset_'+current_year, date2str(monsoon_onset));
  return feature;
});

aez = aez.toList(aez.size());
var indexList = ee.List.sequence(0, start_dates.size().subtract(1));

aez = indexList.iterate(function(curIndex, prev){
  return join(prev, 'dryspell_', true, monthly_dryspells, start_dates, curIndex);
}, aez);
// print('dryspell added', aez);

aez = indexList.iterate(function(curIndex, prev){
  return join(prev, 'monthly_rainfall_deviation_', true, monthly_rainfall_deviations, start_dates, curIndex);
}, aez);
// print('m rfdev added added', aez);

aez = indexList.iterate(function(curIndex, prev){
  return join(prev, 'spi_', true, monthly_spis, start_dates, curIndex);
}, aez);
// print('spi added', aez);

aez = indexList.iterate(function(curIndex, prev){
  return join(prev, 'vci_', true, monthly_vcis, start_dates, curIndex);
}, aez);
// print('vci added', aez);


aez = join(aez, 'kharif_croppable_sqkm', false, percentage_of_area_sown, [], -1);
aez = join(aez, 'kharif_cropped_sqkm_'+current_year, false, percentage_of_area_sown, [], -1);
aez = join(aez, 'percent_of_area_cropped_kharif_'+current_year, false, percentage_of_area_sown, [], -1);

aez = indexList.iterate(function(curIndex, prev){
  return join(prev, 'mai_', true, monthly_mais, start_dates, curIndex);
}, aez);


aez = aez_copy.map(function(feature){
  var pk = feature.get(primaryKey);
  var f = ee.Feature((ee.List(aez).filter(ee.Filter.eq(primaryKey, pk))).get(0));
  return f;
});


aez = start_dates.iterate(function(date, prev){
  prev = getMeteorologicalDrought(date, prev);
  prev = getDrought(date, prev);
  return prev;
}, aez);

aez = start_dates.iterate(function(date, prev){
  prev = getWeeklyLabels(date, start_dates.get(0), prev);
  return prev;
}, aez);

aez = ee.FeatureCollection(aez);

aez = getWeeklyFreqOfDiffTypesOfDrought(start_dates, aez);

aez = ee.FeatureCollection(aez);

aez = getDroughtFreqIntensity(aez, 0);
aez = getDroughtFreqIntensity(aez, 1);
aez = getDroughtFreqIntensity(aez, 2);
aez = getDroughtFreqIntensity(aez, 3);

print(aez);

var fileloc = 'projects/ee-tirumal/assets/block/drought_modis_mask/';
var filename = block_name+'_'+current_year;

Export.table.toAsset({
  collection: aez,
  description:filename,
  assetId: fileloc+filename
}); 

Export.table.toDrive(aez, filename+'_csv','drought_modis_mask' , filename, 'CSV')

}
