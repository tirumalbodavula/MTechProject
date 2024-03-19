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

var block_slno = 3;
var start_year=2003;
var end_year=2023;

var block = eval('block'+block_slno);
var block_name = eval('block_name'+block_slno);

var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").select('precipitation');
var chirps_available_from_year = 1981; // it is available from 1981-01-01
var chirps_scale = 5566;

// var watersheds = ee.FeatureCollection('users/mtpictd/watersheds_india');
// var agro_eco_zones = ee.FeatureCollection('users/mtpictd/agro_eco_regions');
// var ae_regcode = 13;
// var aez = agro_eco_zones.filter(ee.Filter.eq('ae_regcode', ae_regcode));
// var fc = watersheds.filterBounds(aez);

var fc = block;

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

function getMonsoonOnSetDate(year, roi){
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
    var area = ee.Feature(hmz).geometry().intersection(roi, ee.ErrorMargin(1)).area();
    dummyFeature = dummyFeature.set('area', area);
    return dummyFeature;
  });
  // print(intersectionArea)
  var region_index = ee.Number(ee.Array(intersectionArea.aggregate_array('area')).gt(0).argmax().get(0));
  // print(region_index);
  var mapping = ee.Dictionary({0:'northern', 1:'western', 2:'central', 3:'eastern', 4:'southern'});
  var region = mapping.get(region_index);
  // print(region)
  // var roi = ee.Feature(dictionary.get(region)).geometry();
 
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

// Map.centerObject(fc, 5);
// Map.addLayer(fc);

// chirps_available_from_year
for(var current_year=chirps_available_from_year;current_year<=end_year;current_year++){
  fc = fc.map(function(feature){
      var roi = feature.geometry();
      var onset = getMonsoonOnSetDate(current_year, roi);
      feature = feature.set('monsoon_onset_'+current_year, date2str(onset));
      feature = feature.set('monsoon_onset_day_'+current_year,onset.getRelative('day','year'));
      return feature;
  });
}

// for(var y=start_year;y<=end_year;y++){
//   // print(y, fc.aggregate_array('monsoon_onset_day_'+y));
// }

var getDev= function(feature, curYear, noofyears){
  var start = curYear-noofyears;
  var end = curYear-1;
  // print(start, end, noofyears)
  if(start<1981) start=1982;
  
  var tot2=ee.Number(0);
  var ctyears=ee.Number(0);
  for(var y=start;y<=end;y++){
    var mopast = ee.Number(feature.get('monsoon_onset_day_'+y));
    tot2 = ee.Number(tot2).add(mopast);
    ctyears=ctyears.add(ee.Number(1));
  }

  var dnum = ee.Number(end).subtract(ee.Number(start));
  tot2 = ee.Number(tot2).divide(ctyears);

  // tot2 = ee.Number(tot2).divide(noofyears);
  // print(tot2);
  feature = feature.set('monsoon_onset_avg_'+curYear,tot2);

  var moavg = feature.get('monsoon_onset_avg_'+curYear);
  var mocurr = ee.Number(feature.get('monsoon_onset_day_'+curYear));
  var devDays = ee.Number(moavg).subtract(mocurr);
  var devWeeks = (devDays).divide(ee.Number(7)).int();
  feature = feature.set('monsoon_onset_dev_days_'+curYear,ee.Number(devDays));;
  feature = feature.set('monsoon_onset_dev_weeks_'+curYear,ee.Number(devWeeks));;
  // if(devDays<-6){
  // }
  // else{
  //   feature = feature.set('monsoon_onset_dev_pos_weeks_'+devWeeks,modev)
  // }
  
  
  // var modev = ((mocurr.subtract(moavg)).divide(moavg)).multiply(100);
  return feature;
}

var fe = fc.first();
fe = getDev(fe, 2003, 30);
print(fe)



for(var year=start_year;year<=end_year;year++){
  fc = fc.map(function(feature){
    return getDev(feature, year, 30);
  });
}

print(fc)

var fileloc = 'projects/ee-tirumal/assets/block/';
var filename = block_name+'_monsoon_onsetv2_'+start_year+'-'+end_year;

Export.table.toAsset({
  collection: fc,
  description:filename,
  assetId: fileloc+filename
}); 


