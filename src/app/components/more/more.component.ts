import { Component, OnInit } from '@angular/core';
import { Controller } from '../../control';
import { Helper } from '../../helper';

@Component({
  selector: 'app-more',
  templateUrl: './more.component.html',
  styleUrls: ['./more.component.less'],
})
export class MoreComponent implements OnInit {
  constructor() {}

  async ngOnInit() {
    const controller = new Controller();

    // create the datasets download table
    const datasets = await controller.get_datasets();
    for (const dataset of datasets) {
      if (dataset.disease_name !== 'Ovarian Cancer AU') {
        $('#dataset_download_table').append(
          `
          <tr>
            <td class="full-width">
              <i class=""></i> ${Helper.uppercaseFirstLetter(
                dataset.disease_name
              )}
            </td>
            <td class="">
              <a href="https://exbio.wzw.tum.de/sponge-files/${dataset.disease_name
                .split(' ')
                .join('_')}.zip" class="btn btn-primary link-button">
                  Download
              </a>
            </td>
          </tr>
          `
        );
      } else {
        $('#dataset_download_table').append(
          `
            <tr>
              <td class="full-width">
                <i class=""></i> ${Helper.uppercaseFirstLetter(
                  dataset.disease_name
                )}
              </td>
              <td class="text-center">
                <a >
                    No data available
                </a>
              </td>
            </tr>
            `
        );
      }
    }
  }
}
