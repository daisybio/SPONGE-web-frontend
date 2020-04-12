import { Component, OnInit } from '@angular/core';
import { Controller } from '../../../app/control';

@Component({
  selector: 'app-more',
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.less']
})
export class TutorialComponent implements OnInit {

  constructor() { }

  ngOnInit() {
    $('#api-rabbit').html("<a class='d-flex justify-content-center' target='_blank' href="+Controller.API_ENDPOINT+"/ui>  <img src='assets/img/api_rabbit.png' width='60%' height='100%'>")
    
    
  }

}
