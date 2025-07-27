use crate::test::utils;
use dep::aztec::oracle::{execution::get_block_number, storage::storage_read};
use dep::aztec::protocol_types::storage::map::derive_storage_slot_in_map;

use crate::EasyPrivateVoting;


#[test]
unconstrained fn test_initializer() {
    let (_, voting_contract_address, admin) = utils::setup();

    let block_number = get_block_number();
    let admin_slot = EasyPrivateVoting::storage_layout().admin.slot;
    let admin_storage_value = storage_read(voting_contract_address, admin_slot, block_number);
    let vote_ended_slot = EasyPrivateVoting::storage_layout().vote_ended.slot;
    let vote_ended_storage_value = storage_read(voting_contract_address, vote_ended_slot, block_number);
    assert(admin_storage_value == admin, "Admin should match owner");
    assert(vote_ended_storage_value == false, "Vote ended should be false");
}

#[test]
unconstrained fn test_end_vote() { 
    let (env, voting_contract_address, admin) = utils::setup();

    env.impersonate(admin);

    EasyPrivateVoting::at(voting_contract_address).end_vote().call(&mut env.public());
    let block_number = get_block_number();
    let vote_ended_slot = EasyPrivateVoting::storage_layout().vote_ended.slot;
    let vote_ended_storage_value = storage_read(voting_contract_address, vote_ended_slot, block_number);
    assert(vote_ended_storage_value == true, "Vote ended should be true");
}

#[test]
unconstrained fn test_cast_vote() { 
    let (env, voting_contract_address, _) = utils::setup();
    let alice = env.create_account(2);
    env.impersonate(alice);

    let candidate = 1;
    EasyPrivateVoting::at(voting_contract_address).cast_vote(candidate).call(&mut env.private());
    let block_number = get_block_number();
    let tally_slot = EasyPrivateVoting::storage_layout().tally.slot;
    let candidate_tally_slot = derive_storage_slot_in_map(tally_slot, candidate);
    let tally_storage_value = storage_read(voting_contract_address, candidate_tally_slot, block_number);
    assert(tally_storage_value == Field::from(1), "Tally should be 1");
}

#[test(should_fail)]
unconstrained fn test_fail_vote_twice() {
    let (env, voting_contract_address, _) = utils::setup();
    let alice = env.create_account(2);

    let candidate = 101;

    env.impersonate(alice);
    env.advance_block_by(1);
    EasyPrivateVoting::at(voting_contract_address).cast_vote(candidate).call(&mut env.private());

    // Vote again as alice
    env.advance_block_by(1);
    EasyPrivateVoting::at(voting_contract_address).cast_vote(candidate).call(&mut env.private());
}
    