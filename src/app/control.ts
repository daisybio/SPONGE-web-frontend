import * as $ from "jquery";
import { Data } from '@angular/router';
import { NONE_TYPE } from '@angular/compiler/src/output/output_ast';
import { callbackify } from 'util';


export class Controller {

    constructor() {
    }

    static API_ENDPOINT = "http://10.162.163.20:5000/sponge"
    static CERNA_INTERACTION_FINDALL = "/ceRNAInteraction/findAll"
    static CERNA_INTERACTION_SPECIFIC = "/ceRNAInteraction/findSpecific"
    static FIND_CERNA = "/findceRNA"
    static DATASETS = "/dataset"
    static DATASET_INFORMATION = "/dataset/runInformation"
 
    public get_ceRNA_interactions_all(
        config: {
            disease_name?: string,
            descending?: boolean, 
            information?: boolean,
            limit?: number, 
            ensg_number?: string[],
            callback: (data) => any
        }) 
        {
            let request = Controller.API_ENDPOINT+Controller.CERNA_INTERACTION_FINDALL;
            if (Object.keys(config).length > 1) {
                request += '?'
            }
            if (config.disease_name != undefined) {
                request += "&disease_name="+config.disease_name
            }
            if (config.information != undefined) {
                request += "&information="+config.information
            }
            if (config.limit != undefined) {
                request += "&limit="+config.limit
            }
            if (config.ensg_number != undefined) {
                request += "&ensg_number="+config.ensg_number
            }
            $.getJSON(request,
                data => {
                    return config.callback(data)
                }
            )
        }

    public get_ceRNA_interactions_specific(
        config: {
            disease_name?: string, 
            gene_symbol?: string[],
            offset?: number,
            ensg_number?: string[],
            callback: (data) => any
        })
        {
            let request = Controller.API_ENDPOINT+Controller.CERNA_INTERACTION_SPECIFIC
            if (Object.keys(config).length > 1) {
                request += '?'
            }
            if (config.disease_name != undefined) {
                request += "&disease_name="+config.disease_name
            }
            if (config.gene_symbol != undefined) {
                request += "&gene_symbol="+config.gene_symbol
            }
            if (config.offset != undefined) {
                request += "&offset="+config.offset
            }
            if (config.ensg_number != undefined) {
                request += "&ensg_number="+config.ensg_number
            }
            $.getJSON(request,
                data => {
                    return config.callback(data)
                }
            )
        }

    public get_ceRNA(
        config: {
            disease_name : string,
            gene_type?: string,
            betweenness?: number,
            degree?: number,
            eigenvector?: number,
            sorting?: string,
            descending?: boolean,
            limit?: number,
            offset?: number
            callback: (data) => any
        }
    ){
        let request = Controller.API_ENDPOINT+Controller.FIND_CERNA
        if (Object.keys(config).length > 1) {
            request += '?'
        }
        if (config.disease_name != undefined) {
            request += "&disease_name="+config.disease_name
        }
        if (config.gene_type != undefined) {
            request += "&gene_type="+config.gene_type
        }
        if (config.betweenness != undefined) {
            request += "&betweenness="+config.betweenness
        }
        if (config.degree != undefined) {
            request += "&degree="+config.degree
        }
        if (config.eigenvector != undefined) {
            request += "&eigenvector="+config.eigenvector
        }
        if (config.sorting != undefined) {
            request += "&sorting="+config.sorting
        }
        if (config.descending != undefined) {
            request += "&descending="+config.descending
        }
        if (config.limit != undefined) {
            request += "&limit="+config.limit
        }
        if (config.offset != undefined) {
            request += "&offset="+config.offset
        }
        $.getJSON(request,
            data => {
                return config.callback(data)                
            })
    }
    

    public get_datasets(callback: (data) => any, disease_name?: string) {
        let request = Controller.API_ENDPOINT+Controller.DATASETS
        if (disease_name != undefined) {
            request += "?disease_name="+disease_name
        }
        $.getJSON(request,
            data => {
                return callback(data)
            }
        )
    }

    public get_dataset_information(disease_name: string, callback: (data) => any) {
        $.getJSON(Controller.API_ENDPOINT+Controller.DATASET_INFORMATION+"?disease_name="+disease_name,
            data => {
                return callback(data)
            }
        )
    }
    
    
}