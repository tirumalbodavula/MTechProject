// Uncomment the for lopp if you want to 
// generate the results for all of the years at once
for(var current_year=2003;current_year<=2022;current_year++){

  // var current_year = 2022;
  
  
  /* Import region of interest for blocks - START */
  var block_slno = 4;
  
  var block1 = ee.FeatureCollection('projects/ee-anz208490/assets/rdf_revised_pcraster_pindwara');
  var block2 = ee.FeatureCollection('projects/ee-anz208490/assets/rdf_revised_pcraster_mandalgarh');
  var block3 = ee.FeatureCollection('projects/ee-anz208490/assets/rdf_revised_pcraster_mohanpur');
  var block4 = ee.FeatureCollection('projects/ee-anz208490/assets/rdf_revised_pcraster_masalia');
  var block5 = ee.FeatureCollection('projects/ee-anz208490/assets/rdf_revised_pcraster_angul');
  
  var roi_name1 = 'Pindwara';
  var roi_name2 = 'Mandalgarh';
  var roi_name3 = 'Mohanpur';
  var roi_name4 = 'Masalia';
  var roi_name5 = 'Angul';
  
  var fc = eval('block'+block_slno);
  var roi_name = eval('roi_name'+block_slno);
  /* Import region of interest for blocks - END */
  
  /* Import region of interest for aezs - START */
  // var agro_eco_zones = ee.FeatureCollection('users/mtpictd/agro_eco_regions');
  // var ae_regcode = 13;
  // var aez = agro_eco_zones.filter(ee.Filter.eq('ae_regcode', ae_regcode));
  // var india_microwatersheds = ee.FeatureCollection('users/mtpictd/microwatersheds_india');
  // var roi = india_microwatersheds.filterBounds(aez);
  
  // var fc = roi;
  // var roi_name = 'AEZ'+ae_regcode;
  /* Import region of interest for aezs - END */


  
  var filename = 'cropping_intensity_' + roi_name + '_' + current_year;
  var fileloc = 'projects/ee-rittwick-n-tirumal/assets/blockwise-cropping-intensity/new/';
  var assetId = fileloc+filename;
  print('o/p will be saved into: ', assetId);

  var lulc;
  var lulc_scale = 10;
  var lulc_bandname = 'predicted_label';
  var lulc_available_from = 2003;
  
  // LULC file path example
  // projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/Angul_2003-07-01_2004-06-30_LULCmap_10m
  var lulc_js_list = [];
  for(var year=lulc_available_from;year<=current_year;year++){
    lulc_js_list.push(ee.Image('projects/ee-indiasat/assets/LULC_Version2_Outputs_NewHierarchy/' + roi_name + '_' + year + '-07-01_' + (year+1) + '-06-30_LULCmap_10m'));
  }
  lulc = ee.List(lulc_js_list);
  
  
  
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
  
  // var GREENERY = 1;
  // var WATER = 2;
  // var BUILTUP = 3;
  // var BARRENLAND = 4;
  // var CROPLAND = 5;
  // var FOREST = 6;
  var SINGLE_KHARIF = 9;
  var SINGLE_NON_KHARIF = 10;
  var DOUBLE = 11;
  var TRIPLE = 12;
  
  var args = [
    {label: SINGLE_KHARIF, txt: 'single_kharif_cropped_area_'},
    {label: SINGLE_NON_KHARIF, txt: 'single_non_kharif_cropped_area_'},
    {label: DOUBLE, txt: 'doubly_cropped_area_'},
    {label: TRIPLE, txt: 'triply_cropped_area_'},
  ];
  
  
  args.forEach(function(arg){
    var image = ee.Image(lulc.get(current_year-lulc_available_from)).select(lulc_bandname);
    var mask = image.eq(ee.Number(arg.label));
    var pixelArea = ee.Image.pixelArea();
    var labelArea = pixelArea.updateMask(mask);
    fc = labelArea.reduceRegions(fc, ee.Reducer.sum(), lulc_scale, image.projection());
    fc = fc.map(function(feature){
      var value = feature.get('sum');
      value = ee.Number(value);
      // feature = feature.set(arg.txt+roi_name, value.divide(1e6)); // sqkm
      feature = feature.set(arg.txt+current_year, value); // sqm
      return feature;
    });
  });
  
  /* single cropped area */
  fc = fc.map(function(feature){
    var snglk = ee.Number(feature.get('single_kharif_cropped_area_'+current_year));
    var snglnk = ee.Number(feature.get('single_non_kharif_cropped_area_'+current_year));
    var sng = snglk.add(snglnk);
    feature = feature.set('single_cropped_area_'+current_year, snglk.add(snglnk));
    return feature;
  });
  
  
  
  var snglk_allyears = ee.Image.constant(0);
  var snglnk_allyears = ee.Image.constant(0);
  var trpl_allyears = ee.Image.constant(0);
  var dbl_allyears = ee.Image.constant(0);
  for(var year=lulc_available_from ; year<=current_year ; year++){
    var image = ee.Image(lulc.get(year-lulc_available_from)).select(lulc_bandname);
    snglk_allyears = snglk_allyears.or(image.eq(SINGLE_KHARIF));
    snglnk_allyears = snglnk_allyears.or(image.eq(SINGLE_NON_KHARIF));
    trpl_allyears = trpl_allyears.or(image.eq(DOUBLE));
    dbl_allyears = dbl_allyears.or(image.eq(TRIPLE));
  }
  
  var cropable_area_allyears = snglk_allyears.or(snglnk_allyears).or(trpl_allyears).or(dbl_allyears);
  var mask = cropable_area_allyears;
  var pixelArea = ee.Image.pixelArea();
  var cropableArea = pixelArea.updateMask(mask);
  fc = cropableArea.reduceRegions(fc, ee.Reducer.sum(), lulc_scale);
  fc = fc.map(function(feature){
    var value = feature.get('sum');
    value = ee.Number(value);
    feature = feature.set('total_cropable_area_till_'+current_year, value); // sqm
    return feature;
  });
  
  
  
  // print(fc);
  fc = fc.map(function(feature){
    // for(var year=START_YEAR ; year<=END_YEAR ; year++){
      var total_cropable_area = feature.get('total_cropable_area_till_'+current_year);
      total_cropable_area = ee.Number(total_cropable_area);
    
      var single_cropped_area_ = feature.get('single_cropped_area_'+current_year);
      single_cropped_area_ = ee.Number(single_cropped_area_);
      
      var double_cropped_area_ = feature.get('doubly_cropped_area_'+current_year);
      double_cropped_area_ = ee.Number(double_cropped_area_);
      
      var triple_cropped_area_ = feature.get('triply_cropped_area_'+current_year);
      triple_cropped_area_ = ee.Number(triple_cropped_area_);
      
      var sngl_ptc = (single_cropped_area_.divide(total_cropable_area)).multiply(100);
      var dbl_ptc = (double_cropped_area_.divide(total_cropable_area)).multiply(100);
      var trpl_ptc = (triple_cropped_area_.divide(total_cropable_area)).multiply(100);
      
      var cropping_intensity_ = sngl_ptc.add(dbl_ptc.multiply(2)).add(trpl_ptc.multiply(3));
      cropping_intensity_ = cropping_intensity_.divide( sngl_ptc.add(dbl_ptc).add(trpl_ptc) );
      
      feature = feature.set('cropping_intensity_'+current_year, cropping_intensity_);
    // }
    return feature;
  });
  
  print(fc.aggregate_array('cropping_intensity_'+current_year));
  
  Export.table.toAsset({
    collection: fc,
    description: filename,
    assetId: assetId
  });
  
  Export.table.toDrive(fc, filename+"_toDrive_CSV", 'rittwick_tirumal', filename, 'CSV');
  
  
}


