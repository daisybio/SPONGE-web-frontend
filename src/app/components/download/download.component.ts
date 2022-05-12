import { Component, OnInit } from '@angular/core';
import { Controller } from '../../control';
import { Helper } from '../../helper';
import { MatTabChangeEvent } from '@angular/material/tabs';

@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.less']
})
/** Download section of the spongeDB website. Renders tables to download ceRNA network and spongEffects data for specific cancer types. */
export class DownloadComponent implements OnInit {
  private isLoaded = false;
  private readonly controller = new Controller();
  ngOnInit(): void {
    this.createCeRNANetworkDownloadTable();
  }

  /** Called on tab change. Renders spongEffects table on first tab switch. */
  public tabChanged(tabChangeEvent: MatTabChangeEvent) {
    if (tabChangeEvent.index === 1 && !this.isLoaded) {
      this.createSpongEffectsDataTable();
      this.isLoaded = true;
    }
  }

  /** Loads the ceRNA network data from the api and renders the download table. */
  private createCeRNANetworkDownloadTable(): void {
    this.controller.get_datasets(
      data => {
        for (const dataset of data) {
          if (dataset.disease_name === 'Ovarian Cancer AU') {
            // do nothing
          } else if (dataset.disease_name === 'pancancer') {
            // pancancer is called pancan_unified_no_targets_threshold-05.zip at ftp server
            $('#dataset_download_table').append(
              `
              <tr>
                <td class="full-width">
                  <i></i> ${Helper.uppercaseFirstLetter(dataset.disease_name)}
                </td>
                <td>
                  <a href="https://exbio.wzw.tum.de/sponge-files/pancan_unified_no_targets_threshold-05.zip" class="btn btn-primary link-button">
                      Download
                  </a>
                </td>
              </tr>
              `);
          } else {
            $('#dataset_download_table').append(
              `
              <tr>
                <td class="full-width">
                  <i></i> ${Helper.uppercaseFirstLetter(dataset.disease_name)}
                </td>
                <td>
                  <a href="https://exbio.wzw.tum.de/sponge-files/${dataset.disease_name.split(' ').join('_')}.zip" class="btn btn-primary link-button">
                      Download
                  </a>
                </td>
              </tr>
              `);
          }
        }
      }
    );
  }


  /** Loads the spongEffects ceRNA data and renders the download table. */
  private async createSpongEffectsDataTable(): Promise<void> {
    const dummyData = await this.controller.get_spongEffects_data();
    const table = $('#spongEffects-table');
    for (const dataset of dummyData) {
      table.append(
        `
              <tr>
                <td class="full-width">
                  <i></i> ${Helper.uppercaseFirstLetter(dataset.replace('SpongEffects_', ''))}
                </td>
                <td>
                  <a href="https://exbio.wzw.tum.de/sponge-files/spongEffects/${dataset}.RData" class="btn btn-primary link-button">
                      Download
                  </a>
                </td>
              </tr>
              `);
    }
  }

}
