import { Component, OnInit } from '@angular/core';
import { Controller } from '../../control';
import { Helper } from '../../helper';


@Component({
  selector: 'app-more',
  templateUrl: './more.component.html',
  styleUrls: ['./more.component.less']
})
export class MoreComponent implements OnInit {

  constructor() { }

  ngOnInit() {

    const controller = new Controller()
    const helper = new Helper()

    // create the datasets download table
    controller.get_datasets(
      data => {
        for (const dataset of data) {
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
    )

  }

}
