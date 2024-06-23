
var START_YEAR = 2003;
var END_YEAR = 2022;

var block = ee.FeatureCollection('projects/ee-anz208490/assets/rdf_revised_pcraster_masalia');
var fc = block;
var block_name = 'Masalia';
var lulc_file_prefix = 'masalia_exterior'


var filename = 'cropping_intensity_' + block_name + '_' + START_YEAR + '-'+(END_YEAR%100);
var fileloc = 'projects/ee-rittwick-n-tirumal/assets/blockwise-cropping-intensity-v2/all-year/';
var assetId = fileloc+filename;
print('o/p will be saved into: ', assetId);

var lulc;
var lulc_scale = 10;
var lulc_bandname = 'predicted_label';

// projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/Angul_2003-07-01_2004-06-30_LULCmap_10m

var lulc_js_list = [];
for(var year=START_YEAR;year<=END_YEAR;year++){
  lulc_js_list.push(ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + lulc_file_prefix + '_' + year + '-07-01_' + (year+1) + '-06-30_LULCmap_10m'));
}
lulc = ee.List(lulc_js_list);





/* Label New
0 - Background
1 - Built-up
2 - Water in Kharif
3 - Water in Kharif+Rabi
4 - Water in Kharif+Rabi+Zaid
6 - Tree/Forests
7 - Barrenlands
8 - Single cropping cropland
9 - Single Non-Kharif cropping cropland
10 - Double cropping cropland
11 - Triple cropping cropland
12 - Shrub_Scrub
*/


var SINGLE_KHARIF = 8;
var SINGLE_NON_KHARIF = 9;
var DOUBLE = 10;
var TRIPLE = 11;


var args = [
  {label: SINGLE_KHARIF, txt: 'single_kharif_cropped_area_'},
  {label: SINGLE_NON_KHARIF, txt: 'single_non_kharif_cropped_area_'},
  {label: DOUBLE, txt: 'doubly_cropped_area_'},
  {label: TRIPLE, txt: 'triply_cropped_area_'},
];

// var mws_geo = block.filter(ee.Filter.eq('uid', '12_318533')).first();

/* create croppable area mask */
{
  var croppable_area = ee.Image.constant(0);
  for(var year=2017;year<=2022;year++){
    var lulc_img = ee.Image(lulc.get(year-START_YEAR)).select(lulc_bandname);
    args.forEach(function(arg){
      var label_mask = lulc_img.eq(ee.Number(arg.label));
      croppable_area = croppable_area.or(label_mask);
    })
  }
}

Map.addLayer(block);
Map.addLayer(croppable_area, {min:0, max:1, palette:['brown','lime']}, 'Croppable Mask');
var mask = croppable_area;
var pixelArea = ee.Image.pixelArea();
var cropableArea = pixelArea.updateMask(mask);
fc = cropableArea.reduceRegions(fc, ee.Reducer.sum(), lulc_scale);
fc = fc.map(function(feature){
  var value = feature.get('sum');
  value = ee.Number(value);
  feature = feature.set('total_cropable_area_ever_hydroyear_'+START_YEAR+'_'+END_YEAR, value); // sqm
  return feature;
});


/* unused area in 2017 */
{
  var lulc_2017 = ee.Image(lulc.get(2017-START_YEAR)).select(lulc_bandname);
  var cropped_2017 = ee.Image.constant(0);
  args.forEach(function(arg){
    var label_mask = lulc_2017.eq(ee.Number(arg.label));
    // var im1 = ee.Image(lulc.get(2017-START_YEAR)).select(lulc_bandname);
    cropped_2017 = cropped_2017.or(label_mask);
  });
  
  var unused_area_2017 = croppable_area.and(cropped_2017.not());
}

// Map.addLayer(cropped_2017, {min:0, max:1, palette:['brown','lime']}, 'Cropped areas in 2017');
Map.addLayer(unused_area_2017, {min:0, max:1, palette:['white','brown']}, 'Unused areas in 2017');

// var empty = ee.Image().byte();
// var map = empty.paint(data, 'slope_to_plot');
// var outlinedMap = map.paint(data, -1, 1);


args.forEach(function(arg){
  for(var year=2017 ; year<=END_YEAR ; year++){
    var image = ee.Image(lulc.get(year-START_YEAR)).select(lulc_bandname);
    var mask = image.eq(ee.Number(arg.label));
    var pixelArea = ee.Image.pixelArea();
    var labelArea = pixelArea.updateMask(mask);
    fc = labelArea.reduceRegions(fc, ee.Reducer.sum(), lulc_scale, image.projection());
    fc = fc.map(function(feature){
      var value = feature.get('sum');
      value = ee.Number(value);
      feature = feature.set(arg.txt+year, value); // sqm
      return feature;
    });
  }
});

for(var year=START_YEAR ; year<2017 ; year++){
  var image = ee.Image(lulc.get(year-START_YEAR)).select(lulc_bandname);
  var cropped_in_year = ee.Image.constant(0);
  args.forEach(function(arg){
    var mask = image.eq(ee.Number(arg.label));
    mask = mask.and(unused_area_2017.not());
    mask = mask.and(croppable_area);
    
    var pixelArea = ee.Image.pixelArea();
    var labelArea = pixelArea.updateMask(mask);
    fc = labelArea.reduceRegions(fc, ee.Reducer.sum(), lulc_scale, image.projection());
    fc = fc.map(function(feature){
      var value = feature.get('sum');
      value = ee.Number(value);
      feature = feature.set(arg.txt+year, value); // sqm
      return feature;
    });
  });
}


/* single cropped area */
for(var year=START_YEAR ; year<=END_YEAR ; year++){
  fc = fc.map(function(feature){
    var snglk = ee.Number(feature.get('single_kharif_cropped_area_'+year));
    var snglnk = ee.Number(feature.get('single_non_kharif_cropped_area_'+year));
    var sng = snglk.add(snglnk);
    feature = feature.set('single_cropped_area_'+year, sng);
    return feature;
  });
}



// 'total_cropable_area_ever_hydroyear_2003_2022'
// 'total_cropable_area_ever_hydroyear_2003_2023' will be added if you generate lulc for 2023

// print(fc);
fc = fc.map(function(feature){
  for(var year=START_YEAR ; year<=END_YEAR ; year++){
    var total_cropable_area = feature.get('total_cropable_area_ever_hydroyear_'+START_YEAR+'_'+END_YEAR);
    total_cropable_area = ee.Number(total_cropable_area);
  
    var single_cropped_area_ = feature.get('single_cropped_area_'+year);
    single_cropped_area_ = ee.Number(single_cropped_area_);
    
    var double_cropped_area_ = feature.get('doubly_cropped_area_'+year);
    double_cropped_area_ = ee.Number(double_cropped_area_);
    
    var triple_cropped_area_ = feature.get('triply_cropped_area_'+year);
    triple_cropped_area_ = ee.Number(triple_cropped_area_);
    
    var sngl_frac = (single_cropped_area_.divide(total_cropable_area)).multiply(1);
    var dbl_frac = (double_cropped_area_.divide(total_cropable_area)).multiply(1);
    var trpl_frac = (triple_cropped_area_.divide(total_cropable_area)).multiply(1);
    
    var cropping_intensity_ = sngl_frac.add(dbl_frac.multiply(2)).add(trpl_frac.multiply(3));
    
    feature = feature.set('cropping_intensity_'+year, cropping_intensity_);
  }
  return feature;
});

for(var year=START_YEAR ; year<=END_YEAR ; year++){
  print(year, fc.aggregate_array('cropping_intensity_'+year));
}

Export.table.toAsset({
  collection: fc,
  description: filename,
  assetId: assetId
});

// Export.table.toDrive(fc, filename+"_toDrive_as_CSV", 'rittwick_tirumal', filename+'_CSV', 'CSV');
// Export.table.toDrive(fc, filename+"_toDrive_as_GeoJSON", 'rittwick_tirumal', filename+'_GeoJSON', 'GEO_JSON');

