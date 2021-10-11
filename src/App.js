import React from 'react';
import TreeView from 'devextreme-react/tree-view';
import List from 'devextreme-react/list';
import SelectBox from 'devextreme-react/select-box';
import CheckBox from 'devextreme-react/check-box';
import { GraphQLIntrospector } from './QueryIntrospec.js';
import { Stack } from './Stack.js';
import Spinner from 'react-bootstrap/Spinner';
import { employees } from './data.js';
import * as gql from 'gql-query-builder'
import Card from 'react-bootstrap/Card';
import LoadingButton from '@mui/lab/LoadingButton';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';


class App extends React.Component {
  constructor() {
    super();
    this.treeViewRef = React.createRef();
    const showCheckBoxesModes = ['normal', 'selectAll', 'none'];
    const selectionModes = ['multiple', 'single'];
    const showCheckBoxesMode = showCheckBoxesModes[0];
    const selectionMode = selectionModes[0];
    let schema;
    this.state = {
      schema,
      isLoading: true,
      selectedEmployees: [],
      selectNodesRecursive: true,
      selectByClick: true,
      showCheckBoxesModes,
      showCheckBoxesMode,
      selectionModes,
      selectionMode,
      isSelectionModeDisabled: false,
      isRecursiveDisabled: false,
      gql:'',
      loading: false
    };
    this.treeViewSelectionChanged = this.treeViewSelectionChanged.bind(this);
    this.treeViewContentReady = this.treeViewContentReady.bind(this);
    this.showCheckBoxesModeValueChanged = this.showCheckBoxesModeValueChanged.bind(this);
    this.selectionModeValueChanged = this.selectionModeValueChanged.bind(this);
    this.selectNodesRecursiveValueChanged = this.selectNodesRecursiveValueChanged.bind(this);
    this.selectByClickValueChanged = this.selectByClickValueChanged.bind(this);
    this.doNothing = this.doNothing.bind(this);
    this.reArrange = this.reArrange.bind(this);
    this.getFields = this.getFields.bind(this);
    this.getGQLQuery = this.getGQLQuery.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

 componentDidMount(){
   let graphqlIntrospector = new GraphQLIntrospector('https://api.spacex.land/graphql/');  //https://api.spacex.land/graphql/
   graphqlIntrospector.fetchAllQueries();
   graphqlIntrospector.buildHierarchy()
   .then(data => {
     this.setState(
     {schema: data, isLoading:false}
     )
   });
 }

  handleClick() {
    this.setState({
      loading : true
    });
  }

  render() {
    const {isLoading} = this.state.isLoading;
    return (
      <div>
      {this.state.isLoading ? ( <h4>Loading Schema...</h4>) : (

        <div className="form">
          <h4>Schema</h4>


          <TreeView
            id="treeview"
            ref={this.treeViewRef}
            width={'50%'}
            height={'100%'}
            items={this.state.schema}
            selectNodesRecursive={this.state.selectNodesRecursive}
            selectByClick={this.state.selectByClick}
            showCheckBoxesMode={this.state.showCheckBoxesMode}
            selectionMode={this.state.selectionMode}
            onSelectionChanged={this.treeViewSelectionChanged}
            onContentReady={this.treeViewContentReady}
            itemRender={renderTreeViewItem}
            searchMode="contains"
            searchEnabled={true}
          /> 
          {' '}
          <div className="selected-container">Selected Fields
          <TreeView
            id="treeview3"
            ref={this.treeViewRef}
            width={'80%'}
            height={'100%'}
            items={this.state.selectedEmployees}
            selectNodesRecursive={this.state.selectNodesRecursive}
            selectByClick={this.state.selectByClick}
            showCheckBoxesMode={"none"}
            selectionMode={'single'}
            onSelectionChanged={this.doNothing}
            onContentReady={this.doNothing}
            itemRender={renderTreeViewItem}
            searchMode={"contains"}
          />
            {/* <List
              id="selected-employees"
              width={400}
              height={200}
              showScrollbar="always"
              items={this.state.selectedEmployees}
              itemRender={renderListItem}
            /> */}

          <Card border="primary" style={{ width: '18rem' }}>
              <Card.Body>
                <Card.Title>GraphQL Query</Card.Title>
                <Card.Text>
                  {this.state.gql.query}
                </Card.Text>
                <LoadingButton
                  onClick={this.handleClick}
                  endIcon={<SendIcon />}
                  loading={this.state.loading}
                  loadingPosition="end"
                  variant="contained"
                >
                  Send
                </LoadingButton>
              </Card.Body>
            </Card>
          </div>
        </div>)
    }
      </div>
    );
  }

  treeViewSelectionChanged(e) {
    this.syncSelection(e.component);
  }

  treeViewContentReady(e) {
    this.syncSelection(e.component);
  }

  syncSelection(treeView) {
    let selectedEmployees = treeView.getSelectedNodes();
    let updatedData = this.reArrange(selectedEmployees)
    let gQL = gql.query(this.getGQLQuery(updatedData));
    console.log(gQL);
      //.map((node) => node.itemData);

    this.setState(
      {selectedEmployees: updatedData, gql:gQL}
    );

    // this.setState(() => {
    //   return { selectedEmployees: updatedData, };
    // });
  }

  getGQLQuery(selectedFields){
    if(!selectedFields) return {};
    let gqlObjects = [];
    for( const selected of selectedFields){
      
      let fields = this.getFields(selected);
      let gqlObj = {
        operation: selected.name,
        fields: fields
      }
      gqlObjects.push(gqlObj);
    }
    return gqlObjects;
  }

  getFields(selected){
    let fields = [];
    if(!selected.items) return {};
    for(const field of selected.items){
      if(!field.items)
        fields.push(field.name);
      else{
        let complexObject = {};
        complexObject[field.name] = this.getFields(field);
        fields.push(complexObject);
      }
    }
    return fields;
  }

  reArrange(selectedData){
    if(!selectedData) return {};
    let reArrangedData = [];
    let map = new Map();
    selectedData.forEach(item => {
      let stack = new Stack();
      let currentItem = item.itemData;
      let currentParent = item.parent;
      if(currentParent && !map.has(currentParent.itemData.id)) { currentParent.items = []; currentParent.itemData.items = [];} 
      while(currentItem){
        if(!map.has(currentItem.id)) currentItem.items = [];
        stack.add(currentItem);
        if(currentParent) {
          currentItem = currentParent.itemData;
          currentParent = currentParent.parent
          if(currentParent && !map.has(currentParent.itemData.id)) { currentParent.items = []; currentParent.itemData.items = [];} 
        } else { 
          currentItem = currentParent;
          currentParent = currentParent;
        }
      }

     
      let currentHierarchy = stack.remove();
      let skip = false;
      if(map.has(currentHierarchy.id)) {
        rootOfHierarchy = map.get(currentHierarchy.id);
        skip = true;
      } 
      let rootOfHierarchy = currentHierarchy;
      if(stack.isEmpty) map.set(currentHierarchy.id, currentHierarchy);
      while(!stack.isEmpty()){
        //currentHierarchy.items = [];
        if(!map.has(stack.peek().id)) currentHierarchy.items.push(stack.peek());
        map.set(currentHierarchy.id, currentHierarchy);
        currentHierarchy = stack.remove();
        if(map.has(currentHierarchy.id)) {
          currentHierarchy = map.get(currentHierarchy.id);
        } else {
          map.set(currentHierarchy.id, currentHierarchy);
        }
      }
      if(!skip) reArrangedData.push(rootOfHierarchy);
    });
    return reArrangedData;
  }

  doNothing(){
    console.log("Changed");
  }

  showCheckBoxesModeValueChanged(e) {
    let state = { showCheckBoxesMode: e.value };

    if(e.value === 'selectAll') {
      state.selectionMode = 'multiple';
      state.isRecursiveDisabled = false;
    }
    state.isSelectionModeDisabled = e.value === 'selectAll';

    this.setState(state);
  }

  selectionModeValueChanged(e) {
    let state = { selectionMode: e.value };

    if(e.value === 'single') {
      state.selectNodesRecursive = false;
      this.treeView.unselectAll();
    }
    state.isRecursiveDisabled = e.value === 'single';

    this.setState(state);
  }

  selectNodesRecursiveValueChanged(e) {
    this.setState({ selectNodesRecursive: e.value });
  }

  selectByClickValueChanged(e) {
    this.setState({ selectByClick: e.value });
  }

  get treeView() {
    return this.treeViewRef.current.instance;
  }
}

function renderTreeViewItem(item) {
  return `${item.name}`;
}

function renderListItem(item) {
  return `${item.prefix} ${item.fullName} (${item.position})`;
}

export default App;
