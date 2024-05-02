import { Component, OnInit, Input } from '@angular/core';

declare const igv: any;

@Component({
  selector: 'app-igv',
  templateUrl: './igv.component.html',
  styleUrls: ['./igv.component.less']
})
export class IgvComponent implements OnInit {

  public _hsaList: string[] = [];
  @Input () set hsaList(value: string[]) {
    if (value.length === 0) {
      this._hsaList = [];
      return
    }
    this._hsaList = value;
    this.showModal();
    this.render();
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
      "locus": "chr8:72,551,601-145,138,636",
      "tracks": this._hsaList.map((hsa) => {
        return {
          "name": hsa,
          "url": `https://exbio.wzw.tum.de/sponge-static/bedfiles/${hsa}.bed`,
          "format": "bed"
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
        this.browser.search("chr8:72,551,601-145,138,636");
        this.hideLoadingSpinner();
      })
    
  }

}
