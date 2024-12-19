import {Injectable} from '@angular/core';
import {firstValueFrom, lastValueFrom} from "rxjs";
import {HttpClient, HttpHeaders} from "@angular/common/http";


@Injectable({
  providedIn: 'root'
})
export class HttpService {
  constructor(private http: HttpClient) {
  }

  async getRequest<T>(request: string): Promise<T> {
    try {
      return lastValueFrom(this.http.get<T>(request));
    } catch (error) {
      console.log(error);
      return {} as T;
    }
  }

  getHtmlRequest(request: string): Promise<string> {
    return lastValueFrom(this.http.get(request, {responseType: 'text'}));
  }

  async postRequest(request: string, payload: {}): Promise<any> {
    const headers = payload instanceof FormData ? {} : new HttpHeaders({ 'Content-Type': 'application/json' });
    try {
      return lastValueFrom(this.http.post<any>(request, payload, {headers: headers}));
    } catch (error) {
      console.log(error);
      return;
    }
  }

  async postRequestEncoded(request: string, payload: {}): Promise<any> {
    const payloadEncoded = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === "string") {
        payloadEncoded.set(key, value);
      }
    }
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});

    try {
      return lastValueFrom(this.http.post<any>(request, payloadEncoded.toString(), {headers: headers}));
    } catch (error) {
      console.log(error);
      return;
    }
  }

  async postTextRequestEncoded(request: string, payload: {}): Promise<any> {
    const payloadEncoded = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === "string") {
        payloadEncoded.set(key, value);
      }
    }
    const options = {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,text/plain'
      }),
      responseType: 'text' as 'json'
    }

    try {
      return lastValueFrom(this.http.post<any>(request, payloadEncoded.toString(), options));
    } catch (error) {
      console.log(error);
      return;
    }
  }

  async checkIfUrlExists(url: string): Promise<boolean> {
    return !!await firstValueFrom(this.http.head(url)).catch(_ => {
      console.debug("URL does not exist", url)
    });
  }
}
