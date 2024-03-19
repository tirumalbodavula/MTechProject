var fc = ee.FeatureCollection('projects/ee-dharmisha-siddharth/assets/Mohanpur/Mohanpur_uid');

var lulc;
var lulc_scale;
var lulc_bandname;

lulc = ee.List([
  ee.Image("projects/ee-rittwick-n-tirumal/assets/Mohanpur_2016-07-01_2017-06-30_LULCmap_30m"),
  ee.Image('projects/ee-rittwick-n-tirumal/assets/Mohanpur_2017-07-01_2018-06-30_LULCmap_30m'),
  ee.Image('projects/ee-rittwick-n-tirumal/assets/Mohanpur_2018-07-01_2019-06-30_LULCmap_30m'),
  ee.Image('projects/ee-rittwick-n-tirumal/assets/Mohanpur_2019-07-01_2020-06-30_LULCmap_30m'),  
  ee.Image('projects/ee-rittwick-n-tirumal/assets/Mohanpur_2020-07-01_2021-06-30_LULCmap_30m'),
  ee.Image('projects/ee-rittwick-n-tirumal/assets/Mohanpur_2021-07-01_2022-06-30_LULCmap_30m'),
  ee.Image('projects/ee-rittwick-n-tirumal/assets/Mohanpur_2022-07-01_2023-06-30_LULCmap_30m'),   
]);
lulc_scale = 30;
lulc_bandname = 'class';


/* Labels
• 1: Greenery
• 2: Water
• 3: Builtup
• 4: Barrenland
• 5: Cropland
• 6: Forest
• 9: Single Kharif
• 10: Single Non Kharif
• 11: Double
• 12: Triple
*/

var GREENERY = 1;
var WATER = 2;
var BUILTUP = 3;
var BARRENLAND = 4;
var CROPLAND = 5;
var FOREST = 6;
var SINGLE_KHARIF = 9;
var SINGLE_NON_KHARIF = 10;
var DOUBLE = 11;
var TRIPLE = 12;

var START_YEAR = 2016;
var END_YEAR = 2022;

var args = [
  {label: BARRENLAND, txt: 'barrenland_area_'},
  {label: FOREST, txt: 'forest_area_'},
  {label: SINGLE_KHARIF, txt: 'single_kharif_cropped_area_'},
  {label: SINGLE_NON_KHARIF, txt: 'single_non_kharif_cropped_area_'},
  {label: DOUBLE, txt: 'doubly_cropped_area_'},
  {label: TRIPLE, txt: 'triply_cropped_area_'},
];

args.forEach(function(arg){
  for(var year=START_YEAR ; year<=END_YEAR ; year++){
    var image = ee.Image(lulc.get(year-START_YEAR)).select(lulc_bandname);
    var mask = image.eq(ee.Number(arg.label));
    print('mask', mask);
    var pixelArea = ee.Image.pixelArea();
    var forestArea = pixelArea.updateMask(mask);
    print('forestArea', forestArea);
    fc = forestArea.reduceRegions(fc, ee.Reducer.sum(), lulc_scale, image.projection());
    print('fc', fc);
    fc = fc.map(function(feature){
      var value = feature.get('sum');
      value = ee.Number(value);
      feature = feature.set(arg.txt+year, value.divide(1e6));
      return feature;
    });
  }
});

// print(fc);


/* total cropped area */
/* Kharif = single kharif + double + triple */
/* rabi = single non kharif + double + triple */
/* zaid = triple */
for(var year=START_YEAR ; year<=END_YEAR ; year++){
  fc = fc.map(function(feature){
    var snglk = ee.Number(feature.get('single_kharif_cropped_area_'+year));
    var snglnk = ee.Number(feature.get('single_non_kharif_cropped_area_'+year));
    var dbl = ee.Number(feature.get('doubly_cropped_area_'+year));
    var trpl = ee.Number(feature.get('triply_cropped_area_'+year));
    feature = feature.set('total_cropped_area_'+year, snglk.add(snglnk).add(dbl).add(trpl));
    feature = feature.set('kharif_cropped_area_'+year, snglk.add(dbl).add(trpl));
    feature = feature.set('rabi_cropped_area_'+year, snglnk.add(dbl).add(trpl));
    feature = feature.set('zaid_cropped_area_'+year, trpl);
    return feature;
  });
}






var filename = 'Mohanpur_2016-'+(END_YEAR%100);
var fileloc = 'projects/ee-rittwick-n-tirumal/assets/area-under-different-lulc-labels/mohanpur/';
Export.table.toAsset({
  collection: fc,
  description: filename,
  assetId: fileloc+filename
});


