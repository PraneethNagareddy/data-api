import axios from 'axios';
import * as gql from 'gql-query-builder'

export class GraphQLIntrospector{
    constructor(url){
        this.baseURL = url;
    }

    _buildFetchAllQueriesURL(){
        return gql.query({
            operation: "__schema",
            fields: [
                { queryType: [
                    {
                        fields: [
                            "name", 
                            "description",
                            {
                                type : [
                                    "kind",
                                    "name",
                                    {
                                        ofType : [
                                            "name",
                                            "kind",
                                            {
                                                ofType: [
                                                    "name",
                                                    "kind",
                                                    {
                                                        ofType:[
                                                            "name",
                                                            "kind"
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ],
                    }
                ] 
            }
            ]
        });
    }

    _buildFetchAllFieldsQueriesURL(nameVal){
        return gql.query({
            operation: "__type",
            variables: {
                name: { value: nameVal, required: true } 
            },
            fields: [
                {
                    fields: [
                        "name",
                        "description",
                        {
                            type: [
                                "name",
                                "kind",
                                {
                                    ofType: [
                                        "name",
                                        "kind",
                                        {
                                            ofType: [
                                                "name",
                                                "kind",
                                                {
                                                    ofType: [
                                                        "name",
                                                        "kind"
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        });
    }

    _parseResponse(data){
        if(!data) return;
        let parsedData = [];
        data.forEach(item => {
            let name = item.name;
            let description = item.description;
            let kind = item.type.kind;
            let ofType;
            switch(kind){
                case 'OBJECT':
                case 'SCALAR':
                    ofType = item.type.name;
                    break;
                case 'LIST': {
                    let of = item.type.ofType;
                    while(!of.name){
                        of = of.ofType;
                    }
                    ofType = of.name;
                    break;
                }
                case 'NON_NULL': {
                    let of = item.type.ofType;
                    while(!of.name){
                        of = of.ofType;
                    }
                    ofType = of.name;
                    break;
                }
            }
            parsedData.push({
                name: name,
                description: description,
                kind: kind,
                ofType: ofType
            });
        })
        console.log("parsed Data:"+parsedData);
        return parsedData;
    }

    async  fetchAllQueries(){
        let introspectionQuery = this._buildFetchAllQueriesURL();
        return axios.post(
            this.baseURL,
            introspectionQuery
        )
        .then((response) => {
            return this._parseResponse(response.data.data.__schema.queryType.fields);  
        });
    }

    

    async fetchFieldsForQuery(queryType){
        let introspectionQuery = this._buildFetchAllFieldsQueriesURL(queryType);
        return axios.post(
            this.baseURL,
            introspectionQuery
        )
        .then((response) => {
            return this._parseResponse(response.data.data.__type.fields);
        });
    }

    async buildHierarchy(){
        let schemaHierarchy = [];
        let typeMap = new Map();
        let self = this;
        const allQueries = await this.fetchAllQueries();
        let id = 1;

        let promises = [];
        for(const query of allQueries){
            promises.push(this._buildHierarchyRecursive(typeMap, query, id++));
        }
        return Promise.all(promises)
        .then( (hierarchies) => {
            schemaHierarchy.push.apply(schemaHierarchy, hierarchies);
            return schemaHierarchy;
        });
    }

    async _buildHierarchyRecursive(map, queryType, id){
        if(queryType.kind === "SCALAR")
            return Promise.resolve({id: id, name: queryType.name, expanded: false });
        
        let index = 1;
        const fieldsDefinitions = await this._fetchFieldsDef(map, queryType);

        let promises = [];

        for(const field of fieldsDefinitions){
            promises.push(this._buildHierarchyRecursive(map, field, id+'.'+(index++)));
        }

        return Promise.all(promises)
        .then((items) => {
            console.log("Items:"+items);
            return {id: id, items: items, name: queryType.name, expanded: false};       
        });
    }    

    async _fetchFieldsDef(typeMap, queryType){
        if(!typeMap.has(queryType.ofType)) {
            // fieldsDefinition = this.fetchFieldsForQuery(queryType.ofType);
            return this.fetchFieldsForQuery(queryType.ofType)
            .then((fieldsDefinition) => {
                if(!fieldsDefinition) return Promise.resolve([]);
                typeMap.set(queryType.ofType, { name: queryType.ofType, fields: fieldsDefinition});
                return fieldsDefinition;
            });
        } else {
            return Promise.resolve(typeMap.get(queryType.ofType).fields);
        }
    }

}