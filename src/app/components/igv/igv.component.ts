import { Component, OnInit, Input } from '@angular/core';
import { Controller } from 'src/app/control';
import { IGVInput } from 'src/app/interfaces';

declare const igv: any;

@Component({
  selector: 'app-igv',
  templateUrl: './igv.component.html',
  styleUrls: ['./igv.component.less']
})
export class IgvComponent implements OnInit {


  public controller = new Controller();
  public geneInformation: any;

  public _igvInput?: IGVInput;
   @Input() set igvInput(value: IGVInput) {
    if (value.hsaList.length === 0) {
      this._igvInput = undefined;
      return
    }
    this._igvInput = value;
    this.controller.get_gene_information([this._igvInput.gene]).then((geneInformation) => {
      this.geneInformation = geneInformation[0];
      this.showModal();
      this.render();
    });

  }

  public browser: any;
  
  constructor() {
   }

  ngOnInit(): void {
    $("#igvModal").on("hidden.bs.modal", () => {
      igv.removeBrowser(this.browser);
    });
  }

  public showLoadingSpinner() {
    // remove class 'hidden' from #igvModalLoading
    $('#igvModal #igvModalLoading').removeClass('hidden');
  }

  public hideLoadingSpinner() {
    // add class 'hidden' from #igvModalLoading
    $('#igvModal #igvModalLoading').addClass('hidden');
  }

  public showModal() {
    // @ts-ignore
    $('#igvModal').modal({
      show: true,
      keyboard: false,
      focus: true,
      backdrop: true
    });
  }

  public render() {
    var igvDiv = document.getElementById("igv-div");
    var options =
    {
      "genome": "hg38",
      "tracks": this._igvInput.hsaList.map((hsa) => {
        return {
          "name": hsa,
          "url": `https://exbio.wzw.tum.de/sponge-static/bedfiles/${hsa}.bed`,
          "format": "bed",
          "sourceType": "file",
          "type": "annotation",
          "displayMode": "EXPANDED",
          "indexed": false,
        }
      })
    };

    this.showLoadingSpinner();
    igv.createBrowser(igvDiv, options)
      .then((browser) => {
        this.browser = browser;
        // when launching the browser not for the first time,
        // we need to search manually to set the correct region
        // otherwise, it somehow loads an incorrect region
        this.browser.search(`chr${this.geneInformation.chromosome_name}:${this.geneInformation.start_pos}-${this.geneInformation.end_pos}`);
        this.hideLoadingSpinner();
      })
    
  }

}
