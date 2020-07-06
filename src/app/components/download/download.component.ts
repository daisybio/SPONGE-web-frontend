import { Component, OnInit } from '@angular/core';
import { Controller } from '../../control';
import { Helper } from '../../helper';

@Component({
  selector: 'app-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.less']
})
export class DownloadComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    const controller = new Controller()
    const helper = new Helper()

    // create the datasets download table
    controller.get_datasets(
      data => {
        for (const dataset of data) {
          if(dataset['disease_name'] == "Ovarian Cancer AU"){
            // do nothing
          } else if (dataset['disease_name'] == 'pancancer') {
            // pancancer is called pancan_unified_no_targets_threshold-05.zip at ftp server
            $('#dataset_download_table').append(
              `
              <tr>
                <td class="full-width">
                  <i class=""></i> ${helper.uppercaseFirstLetter(dataset['disease_name'])}
                </td>
                <td class="">
                  <a href="https://exbio.wzw.tum.de/sponge-files/pancan_unified_no_targets_threshold-05.zip" class="btn btn-primary link-button">
                      Download
                  </a>
                </td>
              </tr>
              `)
          } else {
            $('#dataset_download_table').append(
              `
              <tr>
                <td class="full-width">
                  <i class=""></i> ${helper.uppercaseFirstLetter(dataset['disease_name'])}
                </td>
                <td class="">
                  <a href="https://exbio.wzw.tum.de/sponge-files/${dataset['disease_name'].split(' ').join('_')}.zip" class="btn btn-primary link-button">
                      Download
                  </a>
                </td>
              </tr>
              `)
          }
        }
      }
    )
  }

}
