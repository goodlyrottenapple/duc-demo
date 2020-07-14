import React from 'react';
import Select , { CreatableSelect } from '@atlaskit/select';
import CountrySelect from '../CountrySelect';
import { allCountries } from '../data/countries';

import { DatePicker } from '@atlaskit/datetime-picker';
import { Grid, GridColumn } from '@atlaskit/page';
import { FieldTextAreaStateless } from '@atlaskit/field-text-area';
import EditorSettingsIcon from '@atlaskit/icon/glyph/editor/settings';
import Button from '@atlaskit/button';
import { notification } from 'antd';
import '../../antd.css';
// import 'antd/dist/antd.css';

import DropdownContainer from '../DropdownContainer';
import { getOntology , getAvailableOntologies } from '../../utils/api'
import './Term.css';

const restriction_ruleEnum = ["UNKNOWN", "NO_CONSTRAINTS", "CONSTRAINTS", "FORBIDDEN"]

const arraysMatch = (arr1, arr2) => {

	// Check if the arrays are the same length
	if (arr1.length !== arr2.length) return false;

	// Check if all items exist and are in the same order
	for (var i = 0; i < arr1.length; i++) {
		if (arr1[i] !== arr2[i]) return false;
	}

	// Otherwise, return true
	return true;

};

const selectInTree = (val, nodes) => {
	let newNodes = [];
	for (const n of nodes) {
		if(n.value === val) {
			n.checked = true;
			return;
		}
		if(n.children) newNodes = newNodes.concat(n.children)
	}
	if(newNodes.length > 0) selectInTree(val, newNodes);
}


export default class Term extends React.Component {

	state = {
		data: this.props.data ? this.props.data : {
			dataUseClass: null,
			dataUseClassOntology: "https://www.ebi.ac.uk/ols/ontologies/duo/download",
			restrictionClass: {restrictionRule: "UNKNOWN", restrictionObject:null, restrictionObjectOntology:null, constraintsDetails:null}
		},
		availableOntologies:[],
		dataUseClassOntology: [],
		restrictionObjectOntology: [],
	}

	componentWillMount() {
		getAvailableOntologies()
			.then(availableOntologies => {
					this.setState({
						availableOntologies: availableOntologies
							.filter(o => o.status === "ok")
							.map(o => ({label: o.abbrev + " - " + o.label, value: o.url + "/download", abbrev:o.abbrev}))
							.concat([
								{label: "Countries (ISO 3166-2)", value: "ISO 3166-2"}, 
								{label: "Date (ISO 8601)", value: "ISO 8601"}, 
							]),
					})
			})
			.then(_ => {
				if(this.state.data.dataUseClassOntology) this.handleDataUseClassOntologyChange(false)({value: this.state.data.dataUseClassOntology})
				// this.setState(prevState => {
				// 	const duc = [...prevState.dataUseClassOntology]
				// 	duc[0].isDefaultValue = true;
				// 	return {
				// 		dataUseClassOntology: duc
				// 	}
				// })
				if(this.state.data.restrictionClass && this.state.data.restrictionClass.restrictionObjectOntology) this.handleRestrictionObjectOntologyChange(false)({value: this.state.data.restrictionClass.restrictionObjectOntology})
			})
	}

  componentDidMount() {
    this.props.setData(this.state.data);
  }


	handleChange = prop_name => e =>  {
		console.log(e)
		const newData = {...this.state.data};

		if (prop_name === 'constraintsDetails'){
			newData.restrictionClass[prop_name] = e.target.value;
		}
		else if (prop_name === "restrictionRule"){
			newData.restrictionClass[prop_name] = e.value;
		}
		else if (prop_name === "restrictionObject"){
			newData.restrictionClass[prop_name] = e.checked ? e.value : null;
		}
		else if (prop_name === "dataUseClass"){
			newData[prop_name] = e.checked ? e.value : null;
		}
    else newData[prop_name] = e.value;

		this.setState({data: newData});
		this.props.setData(newData);
	}

	handleDataUseClassOntologyChange = showPopup => e => {
		if(showPopup) notification.info({
			message: `Fetching the ${e.abbrev ? e.abbrev : e.value} ontology...`,
		});

		getOntology(e.value)
			.then(({ status, json }) => {
				switch (status) {
					case 200:
						if(showPopup) notification.success({
							message: `${e.abbrev ? e.abbrev : e.value} ontology successfully loaded...`,
						});
						this.setState(prevState => {
							if(prevState.data.dataUseClass) selectInTree(prevState.data.dataUseClass, json);
							return {
								data: {...prevState.data, dataUseClassOntology : e.value}, 
								dataUseClassOntology: json
							}
						})
						break;
					default:
						notification.error({
							message: `Loading the ${e.abbrev ? e.abbrev : e.value} ontology failed with the following error:`,
							description: json.detail,
						});

				}
			});

	}


	handleRestrictionObjectOntologyChange = showPopup => e => {
		switch(e.value) {
			case "ISO 3166-2":
				this.setState({
					data: {...this.state.data, restrictionClass : {...this.state.data.restrictionClass, restrictionObjectOntology: e.value}}, 
					restrictionObjectOntology: "countries"
				})
				break;
			case "ISO 8601":
				this.setState({
					data: {...this.state.data, restrictionClass : {...this.state.data.restrictionClass, restrictionObjectOntology: e.value}}, 
					restrictionObjectOntology: "date"
				})
				break;
			default:
				if(showPopup) notification.info({
					message: `Fetching the ${e.abbrev ? e.abbrev : e.value} ontology...`,
				});
				getOntology(e.value)
					.then(({ status, json }) => {
						switch (status) {
							case 200:
								if(showPopup) notification.success({
									message: `${e.abbrev ? e.abbrev : e.value} ontology successfully loaded...`,
								});
								this.setState(prevState => {
									if(prevState.data.restrictionClass.restrictionObject) selectInTree(prevState.data.restrictionClass.restrictionObject, json);

									return {
										data: {...prevState.data, restrictionClass : {...prevState.data.restrictionClass, restrictionObjectOntology: e.value}}, 
										restrictionObjectOntology: json
									}
								})
								break;
							default:
								notification.error({
									message: `Loading the ${e.abbrev ? e.abbrev : e.value} ontology failed with the following error:`,
									description: json.detail,
								});

						}
					});
		}
	}

	getRestrictionObjectOntology = () => {
		switch (this.state.restrictionObjectOntology){
			case "countries":
				return <CountrySelect
					defaultValue={this.state.data.restrictionClass.restrictionObject ? 
						allCountries.find(e => arraysMatch(e.iso_code,this.state.data.restrictionClass.restrictionObject))
					: null}
					onChange={e => this.handleChange('restrictionObject')({value:e.iso_code, checked:true})}
				/>
			case "date":
				return <DatePicker
					id="datepicker"
					// value={value}
					onChange={e => this.handleChange('restrictionObject')({value:e, checked:true})}
					locale={"en-UK"}
				/>
			default:
				return <DropdownContainer
					data={this.state.restrictionObjectOntology}
					mode="radioSelect"
					texts={{placeholder: 
						this.state.restrictionObjectOntology.length === 0 ? 
							"Select an ontology from the ontology dropdown above..." 
						: "Select a Restriction Object term..."}}
					onChange={this.handleChange('restrictionObject')}
				/>
		}
	}

	render() {
		return (
			<Grid>
				<GridColumn medium={14}><h4>Term of use</h4></GridColumn>
				<GridColumn medium={8}>
				{this.props.advancedMode ? 
					<div className="restriction-container">
						<div></div>
						<h5 className="restriction-label">Data Use Class:</h5>

						<h5 className="active-ontology-label">Active onotology:</h5>
						<div className="active-ontology">
							<Select
							className="single-select"
							classNamePrefix="react-select"
							menuPortalTarget={document.body}
							placeholder={"Select an ontology..."}
							styles={{
										menuPortal: base => ({
											...base,
											zIndex: 9999,
										}),
									}}
							options={this.state.availableOntologies}
							value={this.state.data.dataUseClassOntology ? this.state.availableOntologies.find(e => e.value === this.state.data.dataUseClassOntology) : null}
							onChange={this.handleDataUseClassOntologyChange(true)}
						/>
						</div>
					</div> 
				:
					<h5 style={{marginTop: '0.5em', paddingBottom: '0.5em'}}>Data Use Class:</h5>
				}

					<DropdownContainer
						data={this.state.dataUseClassOntology}
						mode="radioSelect"
						texts={{placeholder: this.state.dataUseClassOntology.length === 0 ? 
							"Select an ontology from the ontology dropdown above..."
						: "Select a Data Use Class term..."}}
						onChange={this.handleChange('dataUseClass')}
					/>		
				</GridColumn>

				<GridColumn medium={4}>
					<h5 style={{marginTop: '0.5em', paddingBottom: '0.5em'}}>Restriction Rule:</h5>
					<Select
						className="single-select"
						classNamePrefix="react-select"
						menuPortalTarget={document.body}
						styles={{
									menuPortal: base => ({
										...base,
										zIndex: 9999,
									}),
								}}
						options={restriction_ruleEnum.map(e => ({label: e, value: e}))}
						value={this.state.data.restrictionClass && this.state.data.restrictionClass.restrictionRule && {label:this.state.data.restrictionClass.restrictionRule, value:this.state.data.restrictionClass.restrictionRule}}
						onChange={this.handleChange('restrictionRule')}
					/>
				</GridColumn>

				{this.state.data.restrictionClass && this.state.data.restrictionClass.restrictionRule && this.state.data.restrictionClass.restrictionRule === "CONSTRAINTS" &&
				<GridColumn medium={14}>
					{/* <h5 style={{marginTop: '0.5em', paddingBottom: '0.5em'}}>Restriction Object:</h5> */}

					<div className="restriction-container">
						<div></div>
						<h5 className="restriction-label">Restriction Object:</h5>

						<h5 className="active-ontology-label">Active onotology:</h5>
						<div className="active-ontology">
							<Select
							className="single-select"
							classNamePrefix="react-select"
							menuPortalTarget={document.body}
							placeholder={"Select an ontology..."}
							styles={{
										menuPortal: base => ({
											...base,
											zIndex: 9999,
										}),
									}}
							options={this.state.availableOntologies}
							value={this.state.data.restrictionClass.restrictionObjectOntology ? this.state.availableOntologies.find(e => e.value === this.state.data.restrictionClass.restrictionObjectOntology) : null}
							onChange={this.handleRestrictionObjectOntologyChange(true)}
						/>
						</div>
					</div>
					{this.getRestrictionObjectOntology()}
				</GridColumn>}
				{this.state.data.restrictionClass && this.state.data.restrictionClass.restrictionRule && this.state.data.restrictionClass.restrictionRule === "CONSTRAINTS" &&
				<GridColumn medium={14}>
					<div className="textarea">
					<FieldTextAreaStateless
						name="resourceName"
						label="Constraints Details:"
						value={this.state.data.restrictionClass && this.state.data.restrictionClass.constraintsDetails}
						onChange={this.handleChange('constraintsDetails')}
					/>
					</div>
				</GridColumn>}
			</Grid>

		);
	}
}
