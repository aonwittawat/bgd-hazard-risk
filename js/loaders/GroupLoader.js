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

class GroupLoader {

  /**
   * @type {Portal}
   */
  portal;

  /**
   * @type {string}
   */
  groupId;

  /**
   * @type {PortalGroup}
   *
   */
  group;

  /**
   *
   * @param config
   * @param portal
   */
  constructor(config, portal) {

    // GROUP ID //
    this.groupId = config.group;

    // PORTAL //
    this.portal = portal;

  }

  /**
   *
   * @returns {Promise<PortalGroup>}
   */
  loadGroup() {
    return new Promise((resolve, reject) => {
      if (this.groupId) {

        this.portal.queryGroups({query: `(id:${ this.groupId })`, num: 1}).then(queryResponse => {
          if (queryResponse.results.length) {
            this.group = queryResponse.results[0];
            resolve(this.group);
          } else {
            console.error(new Error("Can't find configured group."));
          }
        });

      } else {
        reject(new Error('No configured Group id.'));
      }
    });
  }

}

GroupLoader.hasGroup = (config) => {
  return ((config.group != null) && config.group.length);
};

export default GroupLoader;
