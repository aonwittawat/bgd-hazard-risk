/*
 Copyright 2022 Esri

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import AppBase from "./support/AppBase.js";
import AppLoader from "./loaders/AppLoader.js";
import SignIn from './apl/SignIn.js';

class Application extends AppBase {

  // PORTAL //
  portal;

  constructor() {
    super();

    // LOAD APPLICATION BASE //
    super.load().then(() => {

      // APPLICATION LOADER //
      const applicationLoader = new AppLoader({app: this});
      applicationLoader.load().then(({portal, group, map, view}) => {
        //console.info(portal, group, map, view);

        // PORTAL //
        this.portal = portal;

        // USER SIGN-IN //
        this.configUserSignIn();

        // SET APPLICATION DETAILS //
        this.setApplicationDetails({map, group});

        // APPLICATION //
        this.applicationReady({portal, group, map, view}).catch(this.displayError).then(() => {
          // HIDE APP LOADER //
          document.getElementById('app-loader').removeAttribute('active');
        });

      }).catch(this.displayError);
    }).catch(this.displayError);

  }

  /**
   *
   */
  configUserSignIn() {

    const signInContainer = document.getElementById('sign-in-container');
    if (signInContainer) {
      const signIn = new SignIn({container: signInContainer, portal: this.portal});
    }

  }

  /**
   *
   * @param view
   */
  configView(view) {
    return new Promise((resolve, reject) => {
      if (view) {
        require([
          'esri/core/reactiveUtils',
          'esri/widgets/Expand',
          'esri/widgets/Home',
          'esri/widgets/Search',
          'esri/widgets/Legend'
        ], (reactiveUtils, Expand, Home, Search, Legend) => {

          //
          // CONFIGURE VIEW SPECIFIC STUFF HERE //
          //
          view.set({
            constraints: {snapToZoom: false},
            popup: {
              dockEnabled: true,
              dockOptions: {
                buttonEnabled: false,
                breakpoint: false,
                position: "top-right"
              }
            }
          });

          // SEARCH //
          const search = new Search({view: view});
          const searchExpand = new Expand({view: view, content: search, expandTooltip: 'Search'});
          view.ui.add(searchExpand, {position: 'top-left', index: 0});

          // HOME //
          const home = new Home({view});
          view.ui.add(home, {position: 'top-left', index: 1});

          // LEGEND //
          /*
          const legend = new Legend({view: view});
          const legendExpand = new Expand({view: view, content: legend, expandTooltip: 'Legend', expanded: true});
          view.ui.add(legendExpand, {position: 'bottom-left', index: 0});
          reactiveUtils.watch(() => view.widthBreakpoint, (widthView) => {
            widthView === "xsmall" ? legendExpand.expanded = false : legendExpand.expanded = true;
          });
          */

          // VIEW UPDATING //
          this.disableViewUpdating = false;
          const viewUpdating = document.getElementById('view-updating');
          view.ui.add(viewUpdating, 'bottom-right');
          reactiveUtils.watch(() => view.updating, (updating) => {
            (!this.disableViewUpdating) && viewUpdating.toggleAttribute('active', updating);
          });

          resolve();
        });
      } else { resolve(); }
    });
  }

  /**
   *
   * @param portal
   * @param group
   * @param map
   * @param view
   * @returns {Promise}
   */
  applicationReady({portal, group, map, view}) {
    return new Promise(async (resolve, reject) => {
      // VIEW READY //
      this.configView(view).then(() => {

        this.displayRiskMaps(view);
        this.displayHazardMaps(view);

        resolve();
      }).catch(reject);
    });
  }

    /**
   *
   * @param view
   */
     displayRiskMaps(view) {
      require([
        'esri/widgets/Legend',
        'esri/smartMapping/renderers/relationship'
      ], (Legend, relationshipRendererCreator) => {

          // APP DETAILS MODAL //
          const bivariateModal = document.getElementById('bivariate-modal');
          const bivariateDetailsAction = document.getElementById('bivariate-details-action');
          bivariateDetailsAction.addEventListener('click', () => {
            bivariateModal.open = (!bivariateModal.open);
          });
       
          // SWITCH TABS >> CHANGE DISPLAY
          const riskLayer = view.map.allLayers.find(layer => layer.title === "Risk");  
          const analysisTypeOption = document.getElementById('analysis-type-option');
          analysisTypeOption.addEventListener('calciteTabChange', ({detail: {tab}}) => {
            tab === 'hazard-tab' ? hazardOpen() : riskOpen();
          });

          const defaultRenderer = riskLayer.renderer.clone();
          const bivariateBlock = document.getElementById('bivariate-block');
          const hazardOpen = () => {            
            riskLayer.visible= false;
            riskLayer.renderer = defaultRenderer;
          };          
          const riskOpen = () => {
            bivariateBlock.hidden = true;            
            riskLayer.visible= true;
          };
          
          const hazardLabel = document.getElementById('hazard-label');

          const flBtn = document.getElementById('fl-btn');
          flBtn.addEventListener('click', async () => {
            //const isActive = flBtn.toggleAttribute('active');
            //flBtn.setAttribute('appearance', isActive ? 'solid' : 'clear');
            bivariateBlock.hidden = false;
            hazardLabel.innerHTML = "Flood (25 year return period)";
            const response = await createRelationshipRenderer("flood25");
            applyRenderer(response);
          });

          const ssBtn = document.getElementById('ss-btn');
          ssBtn.addEventListener('click', async () => {
            bivariateBlock.hidden = false;
            hazardLabel.innerHTML = "Storm surge (100 year return period)";     
            const response = await createRelationshipRenderer("ss100");
            applyRenderer(response);
          });          

          const lsBtn = document.getElementById('ls-btn');
          lsBtn.addEventListener('click', async () => {
            bivariateBlock.hidden = false;
            hazardLabel.innerHTML = "Landslide due to rainfall";     
            const response = await createRelationshipRenderer("lsrain");
            applyRenderer(response);
          });

          const eqBtn = document.getElementById('eq-btn');
          eqBtn.addEventListener('click', async () => {
            bivariateBlock.hidden = false;
            hazardLabel.innerHTML = "PGA corresponding to earthquake (100 year return period)";     
            const response = await createRelationshipRenderer("eq100");
            applyRenderer(response);
          });

          const tsBtn = document.getElementById('ts-btn');
          tsBtn.addEventListener('click', async () => {
            bivariateBlock.hidden = false;
            hazardLabel.innerHTML = "Tsunami (100 year return period)";     
            const response = await createRelationshipRenderer("ts100");
            applyRenderer(response);
          });

          const createRelationshipRenderer = (hzField) => {
            const params = {
            layer: riskLayer,
            view: view,
            field1: {
              field: hzField
            },
            field2: {
              field: "pop2020"
            },
            classificationMethod: "quantile",
            //focus: "HH",
            numClasses: 3,
          };
          return relationshipRendererCreator.createRenderer(params);
        }

        const applyRenderer = (response) => {
          const renderer = response.renderer;
          const commonProperties = {
            type: "simple-fill",
            outline: {
              "type": "simple-line",
              "color": [153, 153, 153, 64],
              "width": 0.1,
              "style": "solid"
            }
          };
          renderer.defaultLabel  = "No Hazard";
          renderer.defaultSymbol = {
            ...commonProperties,
            color: null
          };
          renderer.uniqueValueInfos.forEach((info) => {
            switch (info.value) {
              case "HH":
                info.label = "Both High";
                info.symbol = {
                  ...commonProperties,
                  color: [98, 19, 113, 255]
                };
                break;
              case "HM":
                info.label = "High - Medium";
                info.symbol = {
                  ...commonProperties,
                  color: [98, 77, 138, 255]
                };
                break;
              case "HL":
                info.label = "Hazard (High)"
                info.symbol = {
                  ...commonProperties,
                  color: [94, 165, 216, 255]
                };
                break;
              case "MH":
                info.label = "Medium - High"
                info.symbol = {
                  ...commonProperties,
                  color: [150, 53, 103, 255]
                };
                break;
              case "MM":
                info.label = "Medium - Medium"
                info.symbol = {
                  ...commonProperties,
                  color: [158, 121, 155, 255]
                };
                break;
              case "ML":
                info.label = "Medium - Low"
                info.symbol = {
                  ...commonProperties,
                  color: [165, 198, 229, 255]
                };
                break;
              case "LH":
                info.label = "Population density (High)"
                info.symbol = {
                  ...commonProperties,
                  color: [201, 88, 92, 255]
                };
                break;
              case "LM":
                info.label = "Low - Medium"
                info.symbol = {
                  ...commonProperties,
                  color: [218, 165, 172, 255]
                };
                break;
              case "LL":
                info.label = "Both Low";
                info.symbol = {
                  ...commonProperties,
                  color: [236, 230, 242, 255]
                };
                break;
            }
          });          
          riskLayer.renderer = renderer;
        }

        const riskLegend = new Legend({
          container: "risk-legend-node",
          view: view,
          layerInfos: [{ title: "Legend", layer: riskLayer }]
        });        

      });
     }

  /**
   *
   * @param view
   */
   displayHazardMaps(view) {
    require([
      'esri/widgets/Legend'
    ], (Legend) => {

      const createLegend = (displayNode, layerName) =>{
        new Legend({
          container: displayNode,
          view: view,
          layerInfos: [{ title: "Legend", layer: layerName }]
        });
      }

      // FLOOD //
      const flLayer = view.map.allLayers.find(layer => layer.title === "Flood inundation");
      const fl25yrs = document.getElementById("fl-25yrs-switch");
      const fl50yrs = document.getElementById("fl-50yrs-switch");
      const fl100yrs = document.getElementById("fl-100yrs-switch");
      const fl150yrs = document.getElementById("fl-150yrs-switch");

      const fl25yrsLayer = flLayer.findSublayerById(0);
      fl25yrs.addEventListener("calciteSwitchChange", (evt) => {
        fl25yrsLayer.visible = evt.detail.switched;
        fl50yrsLayer.visible = fl100yrsLayer.visible = fl150yrsLayer.visible = false;
        fl50yrs.checked = fl100yrs.checked = fl150yrs.checked = false;
      });
      const fl50yrsLayer = flLayer.findSublayerById(1);
      fl50yrs.addEventListener("calciteSwitchChange", (evt) => {
        fl50yrsLayer.visible = evt.detail.switched;
        fl25yrsLayer.visible = fl100yrsLayer.visible = fl150yrsLayer.visible = false;
        fl25yrs.checked = fl100yrs.checked = fl150yrs.checked = false;
      });
      const fl100yrsLayer = flLayer.findSublayerById(2);
      fl100yrs.addEventListener("calciteSwitchChange", (evt) => {
        fl100yrsLayer.visible = evt.detail.switched;
        fl25yrsLayer.visible = fl50yrsLayer.visible = fl150yrsLayer.visible = false;
        fl25yrs.checked = fl50yrs.checked = fl150yrs.checked = false;
      });
      const fl150yrsLayer = flLayer.findSublayerById(3);
      fl150yrs.addEventListener("calciteSwitchChange", (evt) => {
        fl150yrsLayer.visible = evt.detail.switched;
        fl25yrsLayer.visible = fl50yrsLayer.visible = fl100yrsLayer.visible = false;
        fl25yrs.checked = fl50yrs.checked = fl100yrs.checked = false;
      });
      createLegend("fl-legend-node", flLayer);
      
      const flLayersOpacity = document.getElementById('fl-layer-opacity');
      flLayersOpacity.addEventListener('calciteSliderInput', () => {
        flLayer.opacity = flLayersOpacity.value;
      });

      // STORM SURGE //    
      const ssLayer = view.map.allLayers.find(layer => layer.title === "Storm surge inundation");
      const ss25yrs = document.getElementById("ss-25yrs-switch");
      const ss50yrs = document.getElementById("ss-50yrs-switch");
      const ss100yrs = document.getElementById("ss-100yrs-switch");

      const ss25yrsLayer = ssLayer.findSublayerById(0);
      ss25yrs.addEventListener("calciteSwitchChange", (evt) => {
        ss25yrsLayer.visible = evt.detail.switched;
        ss50yrsLayer.visible = ss100yrsLayer.visible = false;
        ss50yrs.checked = ss100yrs.checked = false;
      });    
      const ss50yrsLayer = ssLayer.findSublayerById(1);
      ss50yrs.addEventListener("calciteSwitchChange", (evt) => {
        ss50yrsLayer.visible = evt.detail.switched;
        ss25yrsLayer.visible = ss100yrsLayer.visible = false;
        ss25yrs.checked = ss100yrs.checked = false;
      });
      const ss100yrsLayer = ssLayer.findSublayerById(2);
      ss100yrs.addEventListener("calciteSwitchChange", (evt) => {
        ss100yrsLayer.visible = evt.detail.switched;
        ss25yrsLayer.visible = ss50yrsLayer.visible = false;
        ss25yrs.checked = ss50yrs.checked = false;
      });
      createLegend("ss-legend-node", ssLayer);

      const ssLayersOpacity = document.getElementById('ss-layer-opacity');
      ssLayersOpacity.addEventListener('calciteSliderInput', () => {
        ssLayer.opacity = ssLayersOpacity.value;
      });

      // LANDSLIDE //
      const lsLayer = view.map.allLayers.find(layer => layer.title === "Landslide susceptibility");
      const lsRF = document.getElementById("ls-rf-switch");
      const lsEQ = document.getElementById("ls-eq-switch");

      const lsRFLayer = lsLayer.findSublayerById(0);
      lsRF.addEventListener("calciteSwitchChange", (evt) => {
        lsRFLayer.visible = evt.detail.switched;
        lsEQLayer.visible = false;
        lsEQ.checked = false;
      });
      const lsEQLayer = lsLayer.findSublayerById(1);
      lsEQ.addEventListener("calciteSwitchChange", (evt) => {
        lsEQLayer.visible = evt.detail.switched;
        lsRFLayer.visible = false;
        lsRF.checked = false;
      });
      createLegend("ls-legend-node", lsLayer);

      const lsLayersOpacity = document.getElementById('ls-layer-opacity');
      lsLayersOpacity.addEventListener('calciteSliderInput', () => {
        lsLayer.opacity = lsLayersOpacity.value;
      });

      // DROUGHT //
      const drLayer = view.map.allLayers.find(layer => layer.title === "Drought");
      const pmd25yrs = document.getElementById("pmd-10yrs-switch");
      const pmd50yrs = document.getElementById("pmd-50yrs-switch");
      const pmd100yrs = document.getElementById("pmd-100yrs-switch");
      const kd10yrs = document.getElementById("kd-10yrs-switch");
      const kd50yrs = document.getElementById("kd-50yrs-switch");
      const kd100yrs = document.getElementById("kd-100yrs-switch");

      const pmd25yrsLayer = drLayer.findSublayerById(0);
      pmd25yrs.addEventListener("calciteSwitchChange", (evt) => {
        pmd25yrsLayer.visible = evt.detail.switched;
        pmd50yrsLayer.visible = pmd100yrsLayer.visible = kd10yrsLayer.visible = kd50yrsLayer.visible = kd100yrsLayer.visible = false;
        pmd50yrs.checked = pmd100yrs.checked = kd10yrs.checked = kd50yrs.checked = kd100yrs.checked = false;
      });
      const pmd50yrsLayer = drLayer.findSublayerById(1);
      pmd50yrs.addEventListener("calciteSwitchChange", (evt) => {
        pmd50yrsLayer.visible = evt.detail.switched;
        pmd25yrsLayer.visible = pmd100yrsLayer.visible = kd10yrsLayer.visible = kd50yrsLayer.visible = kd100yrsLayer.visible = false;
        pmd25yrs.checked = pmd100yrs.checked = kd10yrs.checked = kd50yrs.checked = kd100yrs.checked = false;
      });
      const pmd100yrsLayer = drLayer.findSublayerById(2);
      pmd100yrs.addEventListener("calciteSwitchChange", (evt) => {
        pmd100yrsLayer.visible = evt.detail.switched;
        pmd25yrsLayer.visible = pmd50yrsLayer.visible = kd10yrsLayer.visible = kd50yrsLayer.visible = kd100yrsLayer.visible = false;
        pmd25yrs.checked = pmd50yrs.checked = kd10yrs.checked = kd50yrs.checked = kd100yrs.checked = false;
      });
      const kd10yrsLayer = drLayer.findSublayerById(3);
      kd10yrs.addEventListener("calciteSwitchChange", (evt) => {
        kd10yrsLayer.visible = evt.detail.switched;
        pmd25yrsLayer.visible = pmd50yrsLayer.visible = pmd100yrsLayer.visible = kd50yrsLayer.visible = kd100yrsLayer.visible = false;
        pmd25yrs.checked = pmd50yrs.checked = pmd100yrs.checked = kd50yrs.checked = kd100yrs.checked = false;
      });
      const kd50yrsLayer = drLayer.findSublayerById(4);
      kd50yrs.addEventListener("calciteSwitchChange", (evt) => {
        kd50yrsLayer.visible = evt.detail.switched;
        pmd25yrsLayer.visible = pmd50yrsLayer.visible = pmd100yrsLayer.visible = kd10yrsLayer.visible = kd100yrsLayer.visible = false;
        pmd25yrs.checked = pmd50yrs.checked = pmd100yrs.checked = kd10yrs.checked = kd100yrs.checked = false;
      });
      const kd100yrsLayer = drLayer.findSublayerById(5);
      kd100yrs.addEventListener("calciteSwitchChange", (evt) => {
        kd100yrsLayer.visible = evt.detail.switched;
        pmd25yrsLayer.visible = pmd50yrsLayer.visible = pmd100yrsLayer.visible = kd10yrsLayer.visible = kd50yrsLayer.visible = false;
        pmd25yrs.checked = pmd50yrs.checked = pmd100yrs.checked = kd10yrs.checked = kd50yrs.checked = false;
      });
      createLegend("dr-legend-node", drLayer);
      const drLayersOpacity = document.getElementById('dr-layer-opacity');
      drLayersOpacity.addEventListener('calciteSliderInput', () => {
        drLayer.opacity = drLayersOpacity.value;
      });

      // EARTHQUAKE //
      const eqLayer = view.map.allLayers.find(layer => layer.title === "PGA corresponding to earthquake");    
      const eq50yrs = document.getElementById("eq-50yrs-switch");
      const eq100yrs = document.getElementById("eq-100yrs-switch");
      const eq200yrs = document.getElementById("eq-200yrs-switch");
      const eq500yrs = document.getElementById("eq-500yrs-switch");
      const eq1000yrs = document.getElementById("eq-1000yrs-switch");

      const eq50yrsLayer = eqLayer.findSublayerById(0);
      eq50yrs.addEventListener("calciteSwitchChange", (evt) => {
        eq50yrsLayer.visible = evt.detail.switched;
        eq100yrsLayer.visible = eq200yrsLayer.visible = eq500yrsLayer.visible = eq1000yrsLayer.visible= false;
        eq100yrs.checked = eq200yrs.checked = eq500yrs.checked = eq1000yrs.checked = false;
      });
      const eq100yrsLayer = eqLayer.findSublayerById(1);
      eq100yrs.addEventListener("calciteSwitchChange", (evt) => {
        eq100yrsLayer.visible = evt.detail.switched;
        eq50yrsLayer.visible = eq200yrsLayer.visible = eq500yrsLayer.visible = eq1000yrsLayer.visible= false;
        eq50yrs.checked = eq200yrs.checked = eq500yrs.checked = eq1000yrs.checked = false;
      });
      const eq200yrsLayer = eqLayer.findSublayerById(2);
      eq200yrs.addEventListener("calciteSwitchChange", (evt) => {
        eq200yrsLayer.visible = evt.detail.switched;
        eq50yrsLayer.visible = eq100yrsLayer.visible = eq500yrsLayer.visible = eq1000yrsLayer.visible= false;
        eq50yrs.checked = eq100yrs.checked = eq500yrs.checked = eq1000yrs.checked = false;
      });
      const eq500yrsLayer = eqLayer.findSublayerById(3);
      eq500yrs.addEventListener("calciteSwitchChange", (evt) => {
        eq500yrsLayer.visible = evt.detail.switched;
        eq50yrsLayer.visible = eq100yrsLayer.visible = eq200yrsLayer.visible = eq1000yrsLayer.visible= false;
        eq50yrs.checked = eq100yrs.checked = eq200yrs.checked = eq1000yrs.checked = false;
      });
      const eq1000yrsLayer = eqLayer.findSublayerById(4);
      eq1000yrs.addEventListener("calciteSwitchChange", (evt) => {
        eq1000yrsLayer.visible = evt.detail.switched;
        eq50yrsLayer.visible = eq100yrsLayer.visible = eq200yrsLayer.visible = eq500yrsLayer.visible= false;;
        eq50yrs.checked = eq100yrs.checked = eq200yrs.checked = eq500yrs.checked = false;
      });
      createLegend("eq-legend-node", eqLayer);

      const eqLayersOpacity = document.getElementById('eq-layer-opacity');
      eqLayersOpacity.addEventListener('calciteSliderInput', () => {
        eqLayer.opacity = eqLayersOpacity.value;
      });

      // TSUNAMI //
      const tsLayer = view.map.allLayers.find(layer => layer.title === "Tsunami inundation");    
      const ts50yrs = document.getElementById("ts-50yrs-switch");
      const ts100yrs = document.getElementById("ts-100yrs-switch");
      const ts200yrs = document.getElementById("ts-200yrs-switch");
      const ts500yrs = document.getElementById("ts-500yrs-switch");
      const ts1000yrs = document.getElementById("ts-1000yrs-switch");

      const ts50yrsLayer = tsLayer.findSublayerById(0);
      ts50yrs.addEventListener("calciteSwitchChange", (evt) => {
        ts50yrsLayer.visible = evt.detail.switched;
        ts100yrsLayer.visible = ts200yrsLayer.visible = ts500yrsLayer.visible = ts1000yrsLayer.visible= false;
        ts100yrs.checked = ts200yrs.checked = ts500yrs.checked = ts1000yrs.checked = false;
      });
      const ts100yrsLayer = tsLayer.findSublayerById(1);
      ts100yrs.addEventListener("calciteSwitchChange", (evt) => {
        ts100yrsLayer.visible = evt.detail.switched;
        ts50yrsLayer.visible = ts200yrsLayer.visible = ts500yrsLayer.visible = ts1000yrsLayer.visible= false;
        ts50yrs.checked = ts200yrs.checked = ts500yrs.checked = ts1000yrs.checked = false;
      });
      const ts200yrsLayer = tsLayer.findSublayerById(2);
      ts200yrs.addEventListener("calciteSwitchChange", (evt) => {
        ts200yrsLayer.visible = evt.detail.switched;
        ts50yrsLayer.visible = ts100yrsLayer.visible = ts500yrsLayer.visible = ts1000yrsLayer.visible= false;
        ts50yrs.checked = ts100yrs.checked = ts500yrs.checked = ts1000yrs.checked = false;
      });
      const ts500yrsLayer = tsLayer.findSublayerById(3);
      ts500yrs.addEventListener("calciteSwitchChange", (evt) => {
        ts500yrsLayer.visible = evt.detail.switched;
        ts50yrsLayer.visible = ts100yrsLayer.visible = ts200yrsLayer.visible = ts1000yrsLayer.visible= false;
        ts50yrs.checked = ts100yrs.checked = ts200yrs.checked = ts1000yrs.checked = false;
      });
      const ts1000yrsLayer = tsLayer.findSublayerById(4);
      ts1000yrs.addEventListener("calciteSwitchChange", (evt) => {
        ts1000yrsLayer.visible = evt.detail.switched;
        ts50yrsLayer.visible = ts100yrsLayer.visible = ts200yrsLayer.visible = ts500yrsLayer.visible= false;;
        ts50yrs.checked = ts100yrs.checked = ts200yrs.checked = ts500yrs.checked = false;
      });
      createLegend("ts-legend-node", tsLayer);

      const tsLayersOpacity = document.getElementById('ts-layer-opacity');
      tsLayersOpacity.addEventListener('calciteSliderInput', () => {
        tsLayer.opacity = tsLayersOpacity.value;
      });

    });
  }
}

export default new Application();