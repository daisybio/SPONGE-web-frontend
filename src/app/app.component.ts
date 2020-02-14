import { Component } from '@angular/core'
import { Helper } from 'src/app/helper'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent {
  /*
  TS CODE HERE WILL BE EXECUTED IN EVERY COMPONENT
  */
  title = 'SPONGE-web-frontend';

  constructor() {
  }

  ngOnInit() {

    const helper = new Helper()

    // check cookies 
    if (helper.getCookie("cookie_accepted") != '1') {
      // cookies have not been accepted
      $('#cookie-accept').click( () => {
        $('.bottom-cookie').addClass('hidden')
        // set cookie to remember that user has accepted cookies
        helper.setCookie("cookie_accepted", 1, 100)
      })
    } else {
      // cookies have already been accepted
      $('.bottom-cookie').addClass('hidden')
    }
    
  }
}
