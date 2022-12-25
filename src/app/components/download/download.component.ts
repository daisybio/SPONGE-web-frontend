import { Component, OnInit } from '@angular/core';
import { Controller } from '../../control';
import { Helper } from '../../helper';
import { MatTabChangeEvent } from '@angular/material/tabs';

@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.less'],
})
/** Download section of the spongeDB website. Renders tables to download ceRNA network and spongEffects data for specific cancer types. */
export class DownloadComponent implements OnInit {
  private isLoaded = false;
  private readonly controller = new Controller();

  ngOnInit(): void {
    this.createTable();
  }

  private async createTable() {
    await this.createCeRNANetworkDownloadTable();
  }
  /** Called on tab change. Renders spongEffects table on first tab switch. */
  public tabChanged(tabChangeEvent: MatTabChangeEvent) {
    if (tabChangeEvent.index === 1 && !this.isLoaded) {
      this.createSpongEffectsDataTable();
      this.isLoaded = true;
    }
  }

  /** Loads the ceRNA network data from the api and renders the download table. */
  private async createCeRNANetworkDownloadTable(): Promise<void> {
    const data = await this.controller.get_datasets();
    // Inline compare function, see https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
    data.sort((a, b) =>
      a.disease_name.toLowerCase() > b.disease_name.toLowerCase() ? 1 : -1
    );
    for (const dataset of data) {
      if (dataset.disease_type === 'Cancer_Subtype') {
        continue;
      }
      if (dataset.disease_name === 'Ovarian Cancer AU') {
        // do nothing
      } else {
        let subtypes;
        if (dataset.disease_name_abbreviation !== null) {
          subtypes = await this.controller.get_datasets(
            dataset.disease_name_abbreviation
          );
        }
        let prefix =
          '[<b>' +
          Helper.CANCER_TYPE_TO_ABBREVIATION.get(dataset.disease_name) +
          '</b>]';
        let downloadLink =
          'https://exbio.wzw.tum.de/sponge-files/Disease/Cancer/' +
          dataset.disease_name.split(' ').join('_') +
          '.zip';
        if (dataset.disease_name === 'pancancer') {
          downloadLink =
            'https://exbio.wzw.tum.de/sponge-files/pancan_unified_no_targets_threshold-05.zip';
          prefix = '';
        }
        $('#dataset_download_table').append(
          `
              <tr>
                <td class="full-width">
                  <i></i>${prefix} ${Helper.uppercaseFirstLetter(
            dataset.disease_name
          )}
                </td>
                <td>
                  <a href="${downloadLink}" class="btn btn-primary link-button">
                      Download
                  </a>
                </td>
              </tr>
              `
        );
        if (subtypes?.length > 0) {
          for (const subtype of subtypes) {
            if (subtype.disease_type !== 'Cancer_Subtype') {
              continue;
            }
            downloadLink =
              'https://exbio.wzw.tum.de/sponge-files/Disease/Cancer/Subtype/' +
              subtype.disease_name.replace(' - ', '_') +
              '.zip';
            const subtypeAbbreviation = subtype.disease_name.replace(
              dataset.disease_name_abbreviation + ' - ',
              ''
            );
            const subtypeName =
              Helper.SUBTYPE_ABBREVIATION_TO_FULL.get(subtypeAbbreviation);

            let fullDisplayLabel = subtypeAbbreviation;
            if (subtypeName) {
              fullDisplayLabel =
                '[<b>' +
                subtypeAbbreviation +
                '</b>] ' +
                Helper.uppercaseFirstLetter(subtypeName);
            }

            $('#dataset_download_table').append(
              `
              <tr style="position: relative; left: 5em; display: block; margin-right: -2.5em">
                <td class="full-width">
                  <i></i> ${fullDisplayLabel}
                </td>
                <td>
                  <a href="${downloadLink}" class="btn btn-primary link-button">
                      Download
                  </a>
                </td>
              </tr>
              `
            );
          }
        }
      }
    }
  }

  /** Loads the spongEffects ceRNA data and renders the download table. */
  private createSpongEffectsDataTable(): void {
    // TODO: In the future, this should probably be refined to automatically retrieve the available elements on the server.
    // controller returns hard coded list of cancer names.
    const data = this.controller.get_spongEffects_data();
    const table = $('#spongEffects-table');
    for (const dataset of data) {
      const diseaseName = dataset.replace('SpongEffects_', '');
      const prefix =
        '[<b>' + Helper.CANCER_TYPE_TO_ABBREVIATION.get(diseaseName) + '</b>]';

      table.append(
        `
              <tr>
                <td class="full-width">
                  <i></i>${prefix} ${Helper.uppercaseFirstLetter(
          dataset.replace('SpongEffects_', '')
        )}
                </td>
                <td>
                  <a href="https://exbio.wzw.tum.de/sponge-files/spongEffects/${dataset}.RData" class="btn btn-primary link-button">
                      Download
                  </a>
                </td>
              </tr>
              `
      );
    }
  }
}
